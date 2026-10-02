from django.conf import settings
from django.test import SimpleTestCase

from config.settings import _env_bool


class TestTheCookieSurvivesTheTrip(SimpleTestCase):
    """
    Without these, every request after a successful login is anonymous and the
    403 reads like a permissions bug rather than a missing cookie.
    """

    def test_the_browser_is_told_to_keep_a_cross_origin_cookie(self):
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)

    def test_the_dev_origin_is_trusted_for_unsafe_methods(self):
        self.assertIn("http://localhost:5173", settings.CSRF_TRUSTED_ORIGINS)

    def test_the_session_cookie_is_not_reachable_from_script(self):
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")

    def test_secure_cookies_follow_debug(self):
        # A cookie marked Secure never travels over plain http, so tying it to
        # DEBUG keeps local work possible without weakening production.
        #
        # Read from the environment rather than settings.DEBUG: the test runner
        # forces DEBUG off, while these were derived at import from whatever
        # the environment said, so comparing against settings.DEBUG would fail
        # on a developer machine and pass in CI for the wrong reason.
        debug = _env_bool("DJANGO_DEBUG", False)

        self.assertEqual(settings.SESSION_COOKIE_SECURE, not debug)
        self.assertEqual(settings.CSRF_COOKIE_SECURE, not debug)


class TestWhatAuthenticatesARequest(SimpleTestCase):
    def test_basic_authentication_is_not_accepted(self):
        # DRF's default includes it. Nothing here uses it, and it would take
        # credentials on every request.
        classes = settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]

        self.assertEqual(classes, ["api.authentication.SessionAuthentication"])
