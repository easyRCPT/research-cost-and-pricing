from typing import cast

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Deliverable, NonStaffCostLine, StaffCostLine
from .permissions import IsSuperadmin
from .serializers.budget_detail_serializer import BudgetDetailSerializer
from .serializers.budget_update_serializer import (
    UPDATE_SERIALIZERS,
    BudgetUpdateSchema,
    SectionSerializer,
)
from .serializers.deliverable_serializer import DeliverableSerializer
from .serializers.lookup_serializer import (
    LOOKUP_SERIALIZERS,
    LookupCreateSerializer,
    LookupTablesSerializer,
    LookupUpdateSerializer,
)
from .serializers.non_staff_line_serializer import NonStaffLineSerializer
from .serializers.project_serializer import (
    ProjectCreateSerializer,
    ProjectRowSerializer,
)
from .serializers.staff_line_serializer import StaffLineSerializer
from .services import (
    budget_details,
    budget_update,
    deliverable,
    lookup_loader,
    lookup_update,
    non_staff_line,
    project,
    staff_line,
    submission,
    submission_validation,
)
from .services.budget_state import require_editable


class ProjectView(APIView):
    """
    The list of projects, and the way to start one.

    Who may see which project is decided one level down, in
    services/project.visible_projects.
    """

    @extend_schema(responses=ProjectRowSerializer(many=True))
    def get(self, request: Request) -> Response:
        rows = project.list_projects(request.user)
        return Response(ProjectRowSerializer(rows, many=True).data)

    @extend_schema(
        request=ProjectCreateSerializer,
        responses={201: ProjectRowSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = project.create(cast(dict, serializer.validated_data), request.user)
        return Response(ProjectRowSerializer(row).data, status=status.HTTP_201_CREATED)


class BudgetDetailView(APIView):
    @extend_schema(responses=BudgetDetailSerializer)
    def get(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        result = budget_details.get_budget_details(budget)
        serializer = BudgetDetailSerializer(result)
        return Response(serializer.data)

    @extend_schema(
        request=BudgetUpdateSchema,
        responses={200: BudgetDetailSerializer, 204: None},
    )
    def patch(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        envelope = SectionSerializer(data=request.data)
        envelope.is_valid(raise_exception=True)
        section: str = cast(dict, envelope.validated_data)["section"]

        serializer = UPDATE_SERIALIZERS[section](data=request.data)
        serializer.is_valid(raise_exception=True)
        data = {"section": section, **cast(dict, serializer.validated_data)}

        result = budget_update.update_field(budget, data)
        if result is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(BudgetDetailSerializer(result).data, status=status.HTTP_200_OK)


class BudgetSubmitView(APIView):
    @extend_schema(responses={200: None})
    def post(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        # Only a draft can be submitted
        require_editable(request.user, budget)
        # Check if the draft is ready
        reasons = submission_validation.validate_submission(budget)
        if reasons:
            return Response(
                {"reasons": reasons},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        submission.submit_budget(budget, request.user)

        return Response(status=status.HTTP_200_OK)


class StaffLineView(APIView):
    @extend_schema(request=StaffLineSerializer, responses={201: BudgetDetailSerializer})
    def post(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        serializer = StaffLineSerializer(
            data=request.data,
            context={"budget": budget},
        )
        serializer.is_valid(raise_exception=True)
        result = staff_line.create(budget, cast(dict, serializer.validated_data))
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    # Spelled with the status code: a bare `responses=` on a delete is
    # documented as 204 No Content, which this one is not.
    @extend_schema(responses={200: BudgetDetailSerializer})
    def delete(self, request: Request, budget_id: int, line_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        # Check that the line belongs to the budget
        line = get_object_or_404(StaffCostLine, id=line_id, budget=budget)
        result = staff_line.delete(budget, line)
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK,
        )


class NonStaffLineView(APIView):
    @extend_schema(
        request=NonStaffLineSerializer, responses={201: BudgetDetailSerializer}
    )
    def post(self, request: Request, budget_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        serializer = NonStaffLineSerializer(
            data=request.data,
            context={"budget": budget},
        )
        serializer.is_valid(raise_exception=True)
        result = non_staff_line.create(budget, cast(dict, serializer.validated_data))
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses={200: BudgetDetailSerializer})
    def delete(self, request: Request, budget_id: int, line_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        # Check that the line belongs to the budget
        line = get_object_or_404(NonStaffCostLine, id=line_id, budget=budget)
        result = non_staff_line.delete(budget, line)
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK,
        )


class DeliverableView(APIView):
    @extend_schema(
        request=DeliverableSerializer, responses={201: BudgetDetailSerializer}
    )
    def post(self, request: Request, budget_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        serializer = DeliverableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = deliverable.create(budget, cast(dict, serializer.validated_data))
        result_serializer = BudgetDetailSerializer(result)
        return Response(
            result_serializer.data,
            status=status.HTTP_201_CREATED,
        )

    # Spelled with the status code: a bare `responses=` on a delete is
    # documented as 204 No Content, which this one is not.
    @extend_schema(responses={200: BudgetDetailSerializer})
    def delete(self, request: Request, budget_id: int, deliverable_id: int) -> Response:
        # Check that the budget exists
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        require_editable(request.user, budget)
        # Check that the deliverable belongs to the budget
        item = get_object_or_404(Deliverable, id=deliverable_id, budget=budget)

        result = deliverable.delete(item)
        result_serializer = BudgetDetailSerializer(result)

        return Response(
            result_serializer.data,
            status=status.HTTP_200_OK,
        )


class LookupView(APIView):
    @extend_schema(responses=LookupTablesSerializer)
    def get(self, request: Request) -> Response:
        tables = lookup_loader.get_lookup_tables()
        return Response(LookupTablesSerializer(tables).data)


class LookupTableView(APIView):
    permission_classes = [IsSuperadmin]

    @extend_schema(request=LookupCreateSerializer, responses={201: None})
    def post(self, request: Request, table: str) -> Response:
        serializer = LookupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            serializer_class = LOOKUP_SERIALIZERS[table]
        except KeyError:
            raise ValidationError(f"Invalid lookup table: {table}")

        validated_data = cast(dict, serializer.validated_data)

        row_serializer = serializer_class(data=validated_data["values"])
        row_serializer.is_valid(raise_exception=True)

        lookup_update.create(
            table=table,
            data=cast(dict, row_serializer.validated_data),
        )

        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(request=LookupUpdateSerializer, responses={204: None})
    def patch(self, request: Request, table: str) -> Response:
        serializer = LookupUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = cast(dict, serializer.validated_data)

        lookup_update.update(
            table=table,
            lookup=cast(dict, validated_data["lookup"]),
            data=cast(dict, validated_data["values"]),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
