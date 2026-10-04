from typing import cast
from uuid import UUID

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers, status
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Deliverable, NonStaffCostLine, StaffCostLine
from api.pagination import Sorted
from api.serializers.budget_detail_serializer import BudgetDetailSerializer
from api.serializers.budget_update_serializer import (
    UPDATE_SERIALIZERS,
    BudgetUpdateSchema,
    SectionSerializer,
)
from api.serializers.deliverable_serializer import DeliverableSerializer
from api.serializers.lookup_serializer import LookupTablesSerializer
from api.serializers.non_staff_line_serializer import NonStaffLineSerializer
from api.serializers.project_serializer import (
    ProjectCreateSerializer,
    ProjectFiltersSerializer,
    ProjectListQuerySerializer,
    ProjectRowSerializer,
    list_query,
)
from api.serializers.staff_line_serializer import StaffLineSerializer
from api.services import (
    budget_clone,
    budget_details,
    budget_update,
    deliverable,
    lookup_loader,
    non_staff_line,
    project,
    staff_line,
    submission,
    submission_validation,
    withdrawal,
)
from api.services.budget_state import require_editable, require_ownership


@extend_schema_view(get=extend_schema(parameters=[ProjectListQuerySerializer]))
class ProjectView(ListAPIView):
    """
    The list of projects, a cursor page at a time, and the way to start one.

    Who may see which project is decided one level down, in
    services/project.visible_projects.
    """

    serializer_class = ProjectRowSerializer
    pagination_class = Sorted
    ordering = "-updated_at"
    orderings = project.SORTS

    def get_queryset(self):
        return project.narrow(
            project.user_listing(self.request.user), **list_query(self.request)
        )

    def paginate_queryset(self, queryset):
        page = super().paginate_queryset(queryset)
        return [project.build_row(row) for row in page or []]

    @extend_schema(
        request=ProjectCreateSerializer,
        responses={201: ProjectRowSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        row = project.create(cast(dict, serializer.validated_data), request.user)
        return Response(ProjectRowSerializer(row).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    """One project as its list row, so a link to it needs no page of the list."""

    @extend_schema(responses=ProjectRowSerializer)
    def get(self, request: Request, project_id: int) -> Response:
        row = get_object_or_404(project.user_listing(request.user), id=project_id)
        return Response(ProjectRowSerializer(project.build_row(row)).data)


class ProjectFiltersView(APIView):
    """Every value the list's filters can take, across the projects you can see."""

    @extend_schema(
        parameters=[ProjectListQuerySerializer], responses=ProjectFiltersSerializer
    )
    def get(self, request: Request) -> Response:
        return Response(
            project.filter_options(
                project.visible_projects(request.user),
                project.visible_budgets(request.user),
                list_query(request),
            )
        )


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
    @extend_schema(request=None, responses={200: None})
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

        submission.submit_budget(request.user, budget)

        return Response(status=status.HTTP_200_OK)


class BudgetWithdrawView(APIView):
    """The owner pulls a costing back out of review (#95)."""

    @extend_schema(request=None, responses={200: BudgetDetailSerializer})
    def post(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        withdrawal.withdraw_budget(request.user, budget)
        result = budget_details.get_budget_details(budget)
        return Response(BudgetDetailSerializer(result).data)


class BudgetCloneView(APIView):
    @extend_schema(request=None, responses={201: BudgetDetailSerializer})
    def post(self, request: Request, budget_id: int) -> Response:
        budget = get_object_or_404(project.visible_budgets(request.user), id=budget_id)
        # Only the owner can clone the budget
        require_ownership(request.user, budget)

        # Clone the budget
        cloned_budget = budget_clone.clone_budget(request.user, budget)

        result = budget_details.get_budget_details(cloned_budget)

        serializer = BudgetDetailSerializer(result)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


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
    def delete(self, request: Request, budget_id: int, line_id: UUID) -> Response:
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
    def delete(self, request: Request, budget_id: int, line_id: UUID) -> Response:
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


class LookupQuerySerializer(serializers.Serializer):
    budget = serializers.IntegerField(required=False, min_value=1)


class LookupView(APIView):
    """
    The lookup tables: the current ones, or with `budget` the ones that
    costing is priced on (#198). A submitted or approved costing is priced on
    the version stamped when it was submitted, so its tables can differ from
    today's; a draft's are today's.
    """

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "budget",
                int,
                required=False,
                description="A costing whose own tables to return.",
            )
        ],
        responses=LookupTablesSerializer,
    )
    def get(self, request: Request) -> Response:
        query = LookupQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        budget_id = cast(dict, query.validated_data).get("budget")
        if budget_id is None:
            tables = lookup_loader.get_lookup_tables()
        else:
            # Only a costing the caller may open.
            budget = get_object_or_404(
                project.visible_budgets(request.user), id=budget_id
            )
            tables = lookup_loader.lookup_tables_for(budget)
        return Response(LookupTablesSerializer(tables).data)
