from typing import cast

from django.contrib.auth.models import Group
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_field
from rest_framework import serializers, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import User, UserOrgAssignment
from api.permissions import IsSuperadmin
from api.services import admin_users


class AdminAssignmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    role = serializers.ChoiceField(choices=UserOrgAssignment.Role.choices)
    department = serializers.CharField(source="department_id", allow_null=True)
    department_name = serializers.CharField(
        source="department.name", allow_null=True, default=None
    )
    faculty = serializers.CharField(source="faculty_id", allow_null=True)
    faculty_name = serializers.CharField(
        source="faculty.name", allow_null=True, default=None
    )


class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()
    last_login = serializers.DateTimeField(allow_null=True)
    groups = serializers.SerializerMethodField()
    assignments = serializers.SerializerMethodField()

    def get_groups(self, user) -> list[str]:
        return sorted(group.name for group in user.groups.all())

    @extend_schema_field(AdminAssignmentSerializer(many=True))
    def get_assignments(self, user) -> list[dict]:
        return AdminAssignmentSerializer(user.org_assignments.all(), many=True).data  # type: ignore[return-value]


class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    groups = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )


class UserUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    is_active = serializers.BooleanField(required=False)
    groups = serializers.ListField(child=serializers.CharField(), required=False)


class AssignmentCreateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserOrgAssignment.Role.choices)
    department = serializers.CharField(required=False, allow_null=True, default=None)
    faculty = serializers.CharField(required=False, allow_null=True, default=None)


def _fresh(user_id: int) -> User:
    return admin_users.users().get(id=user_id)


class UsersView(APIView):
    permission_classes = [IsSuperadmin]

    @extend_schema(
        parameters=[
            OpenApiParameter("q", str, required=False),
            OpenApiParameter("active", bool, required=False),
        ],
        responses=AdminUserSerializer(many=True),
    )
    def get(self, request: Request) -> Response:
        active = request.query_params.get("active")
        found = admin_users.users(
            q=request.query_params.get("q", "").strip(),
            active=None if active is None else active.lower() == "true",
        )
        return Response(AdminUserSerializer(found, many=True).data)

    @extend_schema(request=UserCreateSerializer, responses={201: AdminUserSerializer})
    def post(self, request: Request) -> Response:
        body = UserCreateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        user = admin_users.create_user(
            cast(User, request.user), cast(dict, body.validated_data)
        )
        return Response(
            AdminUserSerializer(_fresh(user.id)).data, status=status.HTTP_201_CREATED
        )


class UserDetailView(APIView):
    permission_classes = [IsSuperadmin]

    @extend_schema(responses=AdminUserSerializer)
    def get(self, request: Request, user_id: int) -> Response:
        return Response(
            AdminUserSerializer(get_object_or_404(admin_users.users(), id=user_id)).data
        )

    @extend_schema(request=UserUpdateSerializer, responses=AdminUserSerializer)
    def patch(self, request: Request, user_id: int) -> Response:
        user = get_object_or_404(User, id=user_id)
        body = UserUpdateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        admin_users.update_user(
            cast(User, request.user), user, cast(dict, body.validated_data)
        )
        return Response(AdminUserSerializer(_fresh(user.id)).data)


class GroupsView(APIView):
    """The group names, so the screen offers these and cannot invent one."""

    permission_classes = [IsSuperadmin]

    @extend_schema(responses=serializers.ListSerializer(child=serializers.CharField()))
    def get(self, request: Request) -> Response:
        return Response(sorted(Group.objects.values_list("name", flat=True)))


class AssignmentsView(APIView):
    permission_classes = [IsSuperadmin]

    @extend_schema(
        request=AssignmentCreateSerializer, responses={201: AdminUserSerializer}
    )
    def post(self, request: Request, user_id: int) -> Response:
        user = get_object_or_404(User, id=user_id)
        body = AssignmentCreateSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        data = cast(dict, body.validated_data)
        admin_users.add_assignment(
            cast(User, request.user),
            user,
            data["role"],
            data["department"],
            data["faculty"],
        )
        return Response(
            AdminUserSerializer(_fresh(user.id)).data, status=status.HTTP_201_CREATED
        )


class AssignmentDetailView(APIView):
    permission_classes = [IsSuperadmin]

    @extend_schema(responses=AdminUserSerializer)
    def delete(self, request: Request, user_id: int, assignment_id: int) -> Response:
        user = get_object_or_404(User, id=user_id)
        admin_users.remove_assignment(cast(User, request.user), user, assignment_id)
        return Response(AdminUserSerializer(_fresh(user.id)).data)
