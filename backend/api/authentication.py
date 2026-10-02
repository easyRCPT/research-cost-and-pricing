"""
Session authentication that can still say 401.

DRF turns an authentication failure into 403 whenever no authentication class
offers a `WWW-Authenticate` header, because it has nothing to put in the
challenge. That collapses two different answers into one: a session app wants
401 for "nobody is signed in" and 403 for "signed in, but not allowed here",
and the frontend redirects to the login page on exactly the first of those.

The scheme name is not one a browser recognises, so nothing pops a native
credentials dialog; it exists only so DRF keeps the status it was given.
"""

from typing import TYPE_CHECKING, Literal

from django.conf import settings
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication as BaseSession
from rest_framework.permissions import SAFE_METHODS, BasePermission
from rest_framework.request import Request

if TYPE_CHECKING:  # DRF imports this module while it is still initialising.
    from rest_framework.views import APIView


class SessionAuthentication(BaseSession):
    # DRF's own base method is unannotated and falls through to None, so a
    # checker reads its return type as None and any real challenge as a
    # widening. Returning one is the entire point of this class.
    def authenticate_header(  # type: ignore[override]
        self, request: Request
    ) -> str | None:
        return "Session"


class SessionScheme(OpenApiAuthenticationExtension):
    """
    Teach the schema generator about the class above.

    drf-spectacular matches its built-in schemes on the authenticator's exact
    class, so subclassing DRF's loses the cookie security scheme and every view
    generates a warning. This restores it, with the same shape as the built-in.
    """

    target_class = "api.authentication.SessionAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema: object) -> dict[str, str]:
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": settings.SESSION_COOKIE_NAME,
        }


class CsrfProtected(BasePermission):
    """
    Require the CSRF token on a door nobody has signed in through yet.

    DRF enforces CSRF inside SessionAuthentication, which only runs once a
    request carries a session, and its APIView is csrf_exempt. So signup and
    login, which are by definition reached without a session, are unprotected
    by default: a hostile page can post to them from a victim's browser and
    sign it into an account the attacker controls, and the work done next is
    saved there.

    Django's csrf_protect decorator would also close this, but it rejects with
    an HTML page, while every other refusal in this API is the JSON envelope
    from drf-standardized-errors. Going through DRF's own check keeps one shape
    for the frontend to read.
    """

    # Literal[True] rather than bool: the only other way out is the exception
    # raised below, and it is the type DRF's own base method is inferred to have.
    def has_permission(self, request: Request, view: "APIView") -> Literal[True]:
        if request.method in SAFE_METHODS:
            return True
        # Raises DRF's PermissionDenied, which the envelope renders.
        BaseSession().enforce_csrf(request)
        return True
