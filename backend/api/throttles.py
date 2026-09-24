from rest_framework.throttling import SimpleRateThrottle


class SignInThrottle(SimpleRateThrottle):
    """Sign-in attempts per email address, whichever IP they come from."""

    scope = "sign_in"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}
