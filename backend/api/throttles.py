import time

from rest_framework.throttling import SimpleRateThrottle


class SignInThrottle(SimpleRateThrottle):
    """Failed sign-in attempts per email address, whichever IP they come from."""

    scope = "sign_in"

    def get_cache_key(self, request, view):
        email = str(request.data.get("email", "")).strip().lower()
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}

    def throttle_success(self):
        return True

    @classmethod
    def record_failure(cls, request) -> None:
        throttle = cls()
        key = throttle.get_cache_key(request, None)
        if key is None or throttle.duration is None:
            return
        now = time.time()
        history = [
            t for t in throttle.cache.get(key, []) if t > now - throttle.duration
        ]
        throttle.cache.set(key, [now, *history], throttle.duration)
