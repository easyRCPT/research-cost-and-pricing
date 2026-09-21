from django.contrib.auth.models import Group
from django.test import Client, TestCase
from django.urls import reverse

from api.models import User

PASSWORD = "a-perfectly-ordinary-password"


class TestCsrfOnWrites(TestCase):
    """
    The cost of session cookies: every unsafe method needs the token.

    These use enforce_csrf_checks, because Django's test client waives CSRF by
    default and would let a missing header pass unnoticed.
    """

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        user = User.objects.create_user(email="ruth@unimelb.edu.au", password=PASSWORD)
        user.groups.set(Group.objects.filter(name="researcher"))

    def token(self):
        """What a browser does on first paint, before anyone is signed in."""
        response = self.client.get(reverse("csrf"))
        self.assertEqual(response.status_code, 204)
        return self.client.cookies["csrftoken"].value

    def sign_in(self):
        response = self.client.post(
            reverse("login"),
            {
                "email": "ruth@unimelb.edu.au",
                "password": PASSWORD,
                "account_type": "researcher",
            },
            "application/json",
            HTTP_X_CSRFTOKEN=self.token(),
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_a_write_without_the_header_is_refused(self):
        self.sign_in()

        response = self.client.post(reverse("logout"), {}, "application/json")

        self.assertEqual(response.status_code, 403)

    def test_a_write_with_the_header_succeeds(self):
        self.sign_in()
        # Signing in rotates the token, so read the cookie back afterwards.
        token = self.client.cookies["csrftoken"].value

        response = self.client.post(
            reverse("logout"), {}, "application/json", HTTP_X_CSRFTOKEN=token
        )

        self.assertEqual(response.status_code, 204)


class TestCsrfOnTheAnonymousDoors(TestCase):
    """
    Signing in is itself protected.

    DRF only enforces CSRF once a request carries a session, and its APIView is
    csrf_exempt, so without csrf_protect the login doors would accept a POST
    from any origin. That is login CSRF: a hostile page can sign someone's
    browser into an account the attacker controls, and the work they do next is
    saved there.
    """

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        user = User.objects.create_user(email="ruth@unimelb.edu.au", password=PASSWORD)
        user.groups.set(Group.objects.filter(name="researcher"))
        # The admin door answers 403 for an ordinary account whatever the
        # token, so that test needs an account the door would otherwise admit.
        boss = User.objects.create_user(email="boss@unimelb.edu.au", password=PASSWORD)
        boss.groups.set(Group.objects.filter(name="superadmin"))

    def credentials(self):
        return {
            "email": "ruth@unimelb.edu.au",
            "password": PASSWORD,
            "account_type": "researcher",
        }

    def test_login_without_a_token_is_refused(self):
        response = self.client.post(
            reverse("login"), self.credentials(), "application/json"
        )

        self.assertEqual(response.status_code, 403)

    def test_signup_without_a_token_is_refused(self):
        response = self.client.post(
            reverse("signup"),
            {
                "email": "new@unimelb.edu.au",
                "password": "another-ordinary-password",
                "first_name": "New",
                "last_name": "Person",
                "account_type": "researcher",
            },
            "application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_the_refusal_is_json_like_every_other_refusal(self):
        # Django's csrf_protect would answer with an HTML page here, which the
        # frontend cannot read alongside every other error it handles.
        response = self.client.post(
            reverse("login"), self.credentials(), "application/json"
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(response["Content-Type"], "application/json")
        self.assertEqual(response.json()["errors"][0]["code"], "permission_denied")

    def test_admin_login_without_a_token_is_refused(self):
        response = self.client.post(
            reverse("admin-login"),
            {"email": "boss@unimelb.edu.au", "password": PASSWORD},
            "application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertNotIn("sessionid", self.client.cookies)


class TestCsrfBootstrap(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def test_it_hands_out_the_cookie_while_signed_out(self):
        response = self.client.get(reverse("csrf"))

        self.assertEqual(response.status_code, 204)
        self.assertIn("csrftoken", self.client.cookies)

    def test_me_cannot_be_the_source_of_the_cookie(self):
        # DRF rejects an anonymous request before the handler runs, so the
        # ensure_csrf_cookie on me never fires. This is the reason csrf exists.
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("csrftoken", self.client.cookies)
