from django.test import TestCase

from api.tests.factories import make_department, make_faculty, make_user


class OrgSearchTest(TestCase):
    def setUp(self):
        self.eng = make_faculty("ENG", "Engineering")
        self.arts = make_faculty("ART", "Arts")
        make_department("CIS", self.eng, name="Computing and Information Systems")
        make_department("MEC", self.eng, name="Mechanical Engineering")
        make_department("HIS", self.arts, name="History")
        self.client.force_login(make_user("ruth@unimelb.edu.au", groups=["staff"]))

    def names(self, response):
        return [row["name"] for row in response.json()["results"]]

    def test_departments_match_on_part_of_the_name_without_regard_to_case(self):
        response = self.client.get("/api/departments/", {"q": "engin"})

        self.assertEqual(self.names(response), ["Mechanical Engineering"])

    def test_departments_match_on_code_and_carry_their_faculty(self):
        response = self.client.get("/api/departments/", {"q": "cis"})

        first = response.json()["results"][0]
        self.assertEqual(first["code"], "CIS")
        self.assertEqual(first["faculty"], "Engineering")
        self.assertEqual(first["faculty_code"], "ENG")

    def test_results_come_a_page_at_a_time_in_name_order(self):
        for n in range(30):
            make_department(f"X{n:02}", self.arts, name=f"Zeta {n:02}")

        first = self.client.get("/api/departments/", {"q": "zeta", "limit": 20})
        rest = self.client.get(first.json()["next"])

        names = self.names(first) + self.names(rest)
        self.assertEqual(len(self.names(first)), 20)
        self.assertEqual(names, [f"Zeta {n:02}" for n in range(30)])
        self.assertIsNone(rest.json()["next"])

    def test_no_query_lists_every_department(self):
        response = self.client.get("/api/departments/")

        self.assertEqual(
            self.names(response),
            ["Computing and Information Systems", "History", "Mechanical Engineering"],
        )

    def test_faculties_are_searched_the_same_way(self):
        response = self.client.get("/api/faculties/", {"q": "ENGIN"})

        self.assertEqual(
            response.json()["results"], [{"code": "ENG", "name": "Engineering"}]
        )

    def test_both_need_a_signed_in_user(self):
        self.client.logout()

        for path in ("/api/departments/", "/api/faculties/"):
            self.assertIn(self.client.get(path).status_code, (401, 403))
