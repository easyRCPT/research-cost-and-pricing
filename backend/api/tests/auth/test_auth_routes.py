import time

from django.contrib.auth.models import Group
from django.core.cache import cache
from django.test import Client, TestCase
from django.urls import reverse

from api.models import Department, Faculty, User, UserOrgAssignment

PASSWORD = "a-perfectly-ordinary-password"


class AuthTestMixin:
    # Supplied by TestCase, which every user of this mixin also inherits.
    client: Client

    def setUp(self):
        # The sign-in throttle counts in the cache, which outlives each test.
        cache.clear()

    @staticmethod
    def make_user(email: str, *, groups: list[str], active: bool = True) -> User:
        user = User.objects.create_user(email=email, password=PASSWORD)
        user.is_active = active
        user.save(update_fields=["is_active"])
        user.groups.set(Group.objects.filter(name__in=groups))
        return user

    def signup(self, **overrides):
        body = {
            "email": "new@unimelb.edu.au",
            "password": PASSWORD,
            "first_name": "New",
            "last_name": "Person",
            "account_type": "researcher",
            **overrides,
        }
        return self.client.post(reverse("signup"), body, "application/json")

    def login(self, email: str, password: str = PASSWORD, account_type="researcher"):
        return self.client.post(
            reverse("login"),
            {"email": email, "password": password, "account_type": account_type},
            "application/json",
        )


class TestSignup(AuthTestMixin, TestCase):
    def test_creates_an_account_in_exactly_one_group(self):
        response = self.signup(account_type="staff")

        self.assertEqual(response.status_code, 201, response.content)
        user = User.objects.get(email="new@unimelb.edu.au")
        self.assertEqual([g.name for g in user.groups.all()], ["staff"])

    def test_the_session_cookie_is_not_reachable_from_script(self):
        response = self.signup()

        cookie = response.cookies["sessionid"]
        self.assertTrue(cookie["httponly"])

    def test_an_existing_email_answers_409_naming_the_field(self):
        self.make_user("taken@unimelb.edu.au", groups=["researcher"])

        response = self.signup(email="taken@unimelb.edu.au")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["errors"][0]["attr"], "email")

    def test_nothing_signs_itself_up_as_superadmin(self):
        response = self.signup(account_type="superadmin")

        self.assertEqual(response.status_code, 400)

    def test_an_address_outside_the_university_is_refused(self):
        response = self.signup(email="someone@gmail.com")

        self.assertEqual(response.status_code, 400)
        error = response.json()["errors"][0]
        self.assertEqual(error["attr"], "email")
        self.assertIn("@unimelb.edu.au", error["detail"])
        self.assertFalse(User.objects.filter(email="someone@gmail.com").exists())

    def test_the_domain_is_matched_without_case(self):
        response = self.signup(email="new@UniMelb.edu.au")

        self.assertEqual(response.status_code, 201, response.content)

    def test_a_subdomain_is_not_the_domain(self):
        response = self.signup(email="new@student.unimelb.edu.au")

        self.assertEqual(response.status_code, 400)


class TestLogin(AuthTestMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.researcher = self.make_user("ruth@unimelb.edu.au", groups=["researcher"])

    def test_signs_in_through_its_own_door(self):
        response = self.login("ruth@unimelb.edu.au")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["groups"], ["researcher"])

    def test_the_wrong_door_is_refused_exactly_like_a_wrong_password(self):
        wrong_door = self.login("ruth@unimelb.edu.au", account_type="staff")
        wrong_password = self.login("ruth@unimelb.edu.au", password="not it")

        self.assertEqual(wrong_door.status_code, 401)
        self.assertEqual(wrong_door.status_code, wrong_password.status_code)
        self.assertEqual(wrong_door.json(), wrong_password.json())

    def test_an_unknown_address_is_refused_the_same_way(self):
        unknown = self.login("nobody@unimelb.edu.au")
        wrong_password = self.login("ruth@unimelb.edu.au", password="not it")

        self.assertEqual(unknown.status_code, 401)
        self.assertEqual(unknown.json(), wrong_password.json())

    def test_a_sixth_attempt_in_a_minute_is_throttled(self):
        for _ in range(5):
            self.login("ruth@unimelb.edu.au", password="not it")

        self.assertEqual(self.login("ruth@unimelb.edu.au").status_code, 429)

    def test_the_throttle_counts_each_address_apart(self):
        for _ in range(5):
            self.login("nobody@unimelb.edu.au")

        self.assertEqual(self.login("ruth@unimelb.edu.au").status_code, 200)

    def test_a_deactivated_account_is_refused_the_same_way(self):
        self.make_user("gone@unimelb.edu.au", groups=["researcher"], active=False)

        deactivated = self.login("gone@unimelb.edu.au")

        self.assertEqual(deactivated.status_code, 401)
        self.assertEqual(
            deactivated.json()["errors"][0]["detail"], "Incorrect email or password."
        )

    def test_an_unknown_address_costs_about_what_a_known_one_does(self):
        # A fast no means the address does not exist, which is a list of who
        # holds an account.
        def elapsed(email: str) -> float:
            start = time.perf_counter()
            self.login(email, password="not it")
            return time.perf_counter() - start

        known = min(elapsed("ruth@unimelb.edu.au") for _ in range(3))
        unknown = min(elapsed("nobody@unimelb.edu.au") for _ in range(3))

        # Generous: the point is the same order of magnitude, not a stopwatch.
        self.assertGreater(unknown, known / 4)

    def test_a_superadmin_comes_through_either_door(self):
        self.make_user("sam@unimelb.edu.au", groups=["staff", "superadmin"])

        as_staff = self.login("sam@unimelb.edu.au", account_type="staff")
        self.client.post(reverse("logout"))
        as_researcher = self.login("sam@unimelb.edu.au", account_type="researcher")

        self.assertEqual(as_staff.status_code, 200)
        self.assertEqual(as_researcher.status_code, 200)

    def test_a_staff_account_with_no_assignment_still_signs_in(self):
        self.make_user("plain@unimelb.edu.au", groups=["staff"])

        response = self.login("plain@unimelb.edu.au", account_type="staff")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["assignments"], [])


class TestAdminLogin(AuthTestMixin, TestCase):
    def test_a_superadmin_signs_in(self):
        self.make_user("sam@unimelb.edu.au", groups=["staff", "superadmin"])

        response = self.client.post(
            reverse("admin-login"),
            {"email": "sam@unimelb.edu.au", "password": PASSWORD},
            "application/json",
        )

        self.assertEqual(response.status_code, 200)

    def test_a_valid_ordinary_account_is_refused_with_403(self):
        # The same answer as a wrong password, so a correct one for an account
        # without the group says nothing.
        self.make_user("ruth@unimelb.edu.au", groups=["researcher"])

        allowed = self.client.post(
            reverse("admin-login"),
            {"email": "ruth@unimelb.edu.au", "password": PASSWORD},
            "application/json",
        )
        wrong = self.client.post(
            reverse("admin-login"),
            {"email": "ruth@unimelb.edu.au", "password": "not it"},
            "application/json",
        )

        self.assertEqual(allowed.status_code, 403)
        self.assertEqual(allowed.json(), wrong.json())


class TestMeAndLogout(AuthTestMixin, TestCase):
    def test_me_is_401_when_nobody_is_signed_in(self):
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)

    def test_me_carries_the_groups_and_the_assignments(self):
        faculty = Faculty.objects.create(code="ENG", name="Engineering")
        department = Department.objects.create(
            code="SOFT", name="CIS", school="Eng", school_code="ENG", faculty=faculty
        )
        hod = self.make_user("hana@unimelb.edu.au", groups=["staff"])
        UserOrgAssignment.objects.create(
            user=hod, role=UserOrgAssignment.Role.HOD, department=department
        )
        self.login("hana@unimelb.edu.au", account_type="staff")

        body = self.client.get(reverse("me")).json()

        self.assertEqual(body["user"]["email"], "hana@unimelb.edu.au")
        self.assertEqual(body["groups"], ["staff"])
        self.assertEqual(body["assignments"][0]["role"], "hod")
        self.assertEqual(body["assignments"][0]["department"], "SOFT")

    def test_me_hands_out_the_csrf_cookie(self):
        # The frontend calls me on first paint, which is what puts the token in
        # place before any write needs it.
        self.make_user("ruth@unimelb.edu.au", groups=["researcher"])
        self.login("ruth@unimelb.edu.au")

        response = self.client.get(reverse("me"))

        self.assertIn("csrftoken", response.cookies)

    def test_logging_out_ends_the_session(self):
        self.make_user("ruth@unimelb.edu.au", groups=["researcher"])
        self.login("ruth@unimelb.edu.au")

        logout = self.client.post(reverse("logout"))

        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get(reverse("me")).status_code, 401)
