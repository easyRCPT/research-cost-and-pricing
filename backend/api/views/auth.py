"""
The five doors.

Sessions rather than tokens: revoking one is a row delete, the cookie is not
reachable from script, and Django ships the whole thing. The cost is CSRF on
every unsafe method, which `me` hands out the cookie for.
"""

from typing import cast

from django.contrib.auth import logout
from django.db import IntegrityError
from django.http import HttpRequest
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    Throttled,
    ValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from api.authentication import CsrfProtected
from api.models import User
from api.serializers.auth_serializer import (
    AdminLoginSerializer,
    LoginSerializer,
    MeSerializer,
    SignupConfirmSerializer,
    SignupPendingSerializer,
    SignupSerializer,
)
from api.services import auth, signup
from api.throttles import SignInThrottle

# One message for a wrong password, an unknown address, a deactivated account
# and the wrong tab. Anything more specific says which accounts exist and what
# kind they are.
WRONG = "Incorrect email or password."
UNCONFIRMED = "Confirm your email first. Check your inbox for the link, or sign up again for a new one."


def _me(user: User) -> Response:
    return Response(MeSerializer(auth.me_for(user)).data)


class SignupView(APIView):
    permission_classes = [AllowAny, CsrfProtected]

    @extend_schema(request=SignupSerializer, responses={202: SignupPendingSerializer})
    def post(self, request: Request) -> Response:
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = cast(dict, serializer.validated_data)

        try:
            user = signup.start_signup(request, data)
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

        return Response({"email": user.email}, status=status.HTTP_202_ACCEPTED)


class SignupStatusView(APIView):
    """Polled by the sign-up tab: 202 while waiting, then 200 and signed in once confirmed."""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: MeSerializer, 202: SignupPendingSerializer})
    def get(self, request: Request) -> Response:
        user = signup.pending_user(request)
        if user is None:
            raise NotFound("No sign-up is waiting on this browser.")
        if not user.email_confirmed:
            return Response({"email": user.email}, status=status.HTTP_202_ACCEPTED)
        signup.finish(request)
        auth.start_session(request, user)
        return _me(user)


class SignupResendView(APIView):
    permission_classes = [AllowAny, CsrfProtected]

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        user = signup.pending_user(request)
        if user is None or user.email_confirmed:
            raise NotFound("No sign-up is waiting on this browser.")
        if not signup.resend(request, user):
            raise Throttled(detail="Wait a few seconds before sending another.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class SignupConfirmView(APIView):
    """The emailed link. Confirms the address; the sign-up tab then signs itself in."""

    permission_classes = [AllowAny, CsrfProtected]

    @extend_schema(request=SignupConfirmSerializer, responses={204: None})
    def post(self, request: Request) -> Response:
        serializer = SignupConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if signup.confirm(cast(dict, serializer.validated_data)["token"]) is None:
            raise ValidationError(
                {"token": "This link has expired or was replaced. Sign up again."}
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


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
            SignInThrottle.record_failure(request)
            raise AuthenticationFailed(WRONG)
        if not user.email_confirmed:
            raise AuthenticationFailed(UNCONFIRMED)

        auth.start_session(request, user)
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
            SignInThrottle.record_failure(request)
            raise PermissionDenied(WRONG)

        auth.start_session(request, user)
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
