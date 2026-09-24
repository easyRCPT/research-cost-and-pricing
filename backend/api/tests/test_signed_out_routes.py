from django.test import TestCase
from django.urls import reverse

# Tries every non-auth route with no session that should return (401 Unauthorised). Routes with ID
# parameters use a fake id = 1 and should refuse before looking up
ROUTES = [
    ("get", "projects", []),
    ("post", "projects", []),
    ("get", "lookups", []),
    ("post", "lookup-table", ["calculation_constants"]),
    ("patch", "lookup-table", ["calculation_constants"]),
    ("get", "budget-detail", [1]),
    ("patch", "budget-detail", [1]),
    ("post", "staff-line", [1]),
    ("delete", "staff-line-detail", [1, 1]),
    ("post", "non-staff-line", [1]),
    ("delete", "non-staff-line-detail", [1, 1]),
    ("post", "deliverable", [1]),
    ("delete", "deliverable-detail", [1, 1]),
]


class SignedOutTestCase(TestCase):
    def test_every_route_answers_401(self):
        for method, name, args in ROUTES:
            with self.subTest(method=method, route=name):
                response = getattr(self.client, method)(reverse(name, args=args))

                self.assertEqual(response.status_code, 401, response.content)
