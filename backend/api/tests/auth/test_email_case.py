from django.db.utils import IntegrityError
from django.test import TestCase

from api.models import User
from api.services import auth

PASSWORD = "a-perfectly-ordinary-password"


class TestOneAddressIsOneAccount(TestCase):
    """
    Signing in matches case-insensitively, so storage has to as well.

    Without this, Ruth@ and ruth@ are two rows that sign-in cannot tell apart,
    and whichever it finds first is the only one that can ever get in.
    """

    def test_the_manager_folds_case_on_the_way_in(self):
        user = User.objects.create_user(email="Ruth@Unimelb.Edu.Au", password=PASSWORD)

        self.assertEqual(user.email, "ruth@unimelb.edu.au")

    def test_a_second_account_differing_only_by_case_is_refused(self):
        User.objects.create_user(email="ruth@unimelb.edu.au", password=PASSWORD)

        with self.assertRaises(IntegrityError):
            # create, not create_user: the database is what has to hold here.
            User.objects.create(email="Ruth@unimelb.edu.au")

    def test_signing_in_works_whatever_case_is_typed(self):
        User.objects.create_user(email="ruth@unimelb.edu.au", password=PASSWORD)

        for typed in (
            "ruth@unimelb.edu.au",
            "Ruth@Unimelb.edu.au",
            "RUTH@UNIMELB.EDU.AU",
        ):
            with self.subTest(typed=typed):
                self.assertIsNotNone(auth.authenticate_by_email(typed, PASSWORD))
