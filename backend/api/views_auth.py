"""
The five doors.

Sessions rather than tokens: revoking one is a row delete, the cookie is not
reachable from script, and Django ships the whole thing. The cost is CSRF on
every unsafe method, which `me` hands out the cookie for.
"""

from typing import cast

from django.contrib.auth import login, logout
from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import CsrfProtected
from .models import User
from .serializers.auth_serializer import (
    AdminLoginSerializer,
    LoginSerializer,
    MeSerializer,
    SignupSerializer,
)
from .services import auth
from .throttles import SignInThrottle

# One message for a wrong password, an unknown address, a deactivated account
# and the wrong tab. Anything more specific says which accounts exist and what
# kind they are.
WRONG = "Incorrect email or password."


def _me(user: User) -> Response:
    return Response(MeSerializer(auth.me_for(user)).data)


class SignupView(APIView):
    permission_classes = [AllowAny, CsrfProtected]

    @extend_schema(request=SignupSerializer, responses={201: MeSerializer})
    def post(self, request: Request) -> Response:
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict, serializer.validated_data)

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=data["email"],
                    password=data["password"],
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                )
                # Exactly one, and never superadmin: nothing self-serves that.
                user.groups.set(Group.objects.filter(name=data["account_type"]))
        except IntegrityError:
            return Response(
                {
                    "type": "validation_error",
                    "errors": [
                        {
                            "code": "unique",
                            "detail": "An account already uses this email address.",
                            "attr": "email",
                        }
                    ],
                },
                status=status.HTTP_409_CONFLICT,
            )

        login(cast(HttpRequest, request), user)
        return Response(
            MeSerializer(auth.me_for(user)).data, status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [AllowAny, CsrfProtected]
    throttle_classes = [SignInThrottle]

    @extend_schema(request=LoginSerializer, responses={200: MeSerializer})
    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict, serializer.validated_data)

        user = auth.authenticate_by_email(data["email"], data["password"])

        # The wrong tab is refused like a wrong password, and takes the same
        # shape of answer, so the tabs cannot be used to enumerate accounts.
        if user is None or not auth.may_use_door(user, data["account_type"]):
            raise AuthenticationFailed(WRONG)

        login(cast(HttpRequest, request), user)  # rotates the session key
        return _me(user)


class AdminLoginView(APIView):
    permission_classes = [AllowAny, CsrfProtected]
    throttle_classes = [SignInThrottle]

    @extend_schema(request=AdminLoginSerializer, responses={200: MeSerializer})
    def post(self, request: Request) -> Response:
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict, serializer.validated_data)

        user = auth.authenticate_by_email(data["email"], data["password"])

        # 403 for every failure, so a correct password for an ordinary account
        # is indistinguishable from a wrong one.
        if user is None or auth.SUPERADMIN not in auth.groups_of(user):
            raise PermissionDenied(WRONG)

        login(cast(HttpRequest, request), user)
        return _me(user)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        # Idempotent: signing out when nobody is signed in is not an error.
        logout(cast(HttpRequest, request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CsrfView(APIView):
    """
    Hand a signed-out browser the csrftoken cookie.

    The login doors below are csrf_protect, and DRF rejects an anonymous
    request at `initial()` before any view code runs, so `/me` cannot be what
    seeds the cookie: while nobody is signed in it answers 401 and its handler
    never executes. The frontend calls this on first paint instead, and the
    cookie is then in place for the login POST. Django rotates the token on
    login, and that rotation sets the cookie again, so this is only needed once
    per browser session.
    """

    permission_classes = [AllowAny]

    # No response body. The cookie is the payload.
    @method_decorator(ensure_csrf_cookie)
    @extend_schema(request=None, responses={204: None})
    def get(self, request: Request) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(ensure_csrf_cookie, name="get")
class MeView(APIView):
    """
    Who is signed in.

    Also refreshes the csrftoken cookie, which matters after a login has
    rotated the token. A signed-out browser gets 401 here and uses CsrfView.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer})
    def get(self, request: Request) -> Response:
        return _me(cast(User, request.user))
