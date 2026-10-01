"""The projects list pages, sorts, searches and filters on the server."""

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from api.models import Budget
from api.tests.factories import (
    make_budget,
    make_department,
    make_faculty,
    make_project,
    make_user,
    seed_lookups,
)


class ProjectListTest(TestCase):
    def setUp(self):
        seed_lookups()
        self.admin = make_user("admin@unimelb.edu.au", groups=["superadmin"])
        self.ann = make_user("ann@unimelb.edu.au", first_name="Ann", last_name="Lee")
        self.bob = make_user("bob@unimelb.edu.au")
        arts = make_department("ART", make_faculty("ARTS", "Arts"), name="History")
        science = make_department("SCI", make_faculty("SCI", "Science"), name="Physics")

        self.apple = self.project("Apple", self.ann, arts, "draft", "300")
        self.cherry = self.project("Cherry", self.bob, science, "approved", "100")
        self.banana = self.project("Banana", self.ann, science, "dean_review", "200")
        self.client.force_login(self.admin)

    def project(self, title, owner, department, status, price):
        project = make_project(owner, department, title=title)
        make_budget(project, status=status, total_price_inc_gst=Decimal(price))
        return project

    def titles(self, url=None, **query):
        response = self.client.get(url or reverse("projects"), query)
        self.assertEqual(response.status_code, 200, response.content)
        return [row["title"] for row in response.json()["results"]]

    def test_newest_activity_first_by_default(self):
        self.assertEqual(self.titles(), ["Banana", "Cherry", "Apple"])

    def test_sorts_by_each_column_either_way(self):
        self.assertEqual(self.titles(ordering="title"), ["Apple", "Banana", "Cherry"])
        self.assertEqual(
            self.titles(ordering="-total_price_inc_gst"), ["Apple", "Banana", "Cherry"]
        )
        self.assertEqual(self.titles(ordering="status"), ["Cherry", "Banana", "Apple"])
        self.assertEqual(self.titles(ordering="owner"), ["Apple", "Banana", "Cherry"])
        self.assertEqual(
            self.titles(ordering="department"), ["Apple", "Cherry", "Banana"]
        )

    def test_an_unknown_sort_is_a_400(self):
        response = self.client.get(reverse("projects"), {"ordering": "budget_id"})
        self.assertEqual(response.status_code, 400)

    def test_pages_follow_the_sort(self):
        first = self.client.get(reverse("projects"), {"ordering": "title", "limit": 2})
        body = first.json()
        self.assertEqual([r["title"] for r in body["results"]], ["Apple", "Banana"])

        rest = self.client.get(body["next"]).json()
        self.assertEqual([r["title"] for r in rest["results"]], ["Cherry"])
        self.assertIsNone(rest["next"])

    def test_searches_title_department_and_owner(self):
        self.assertEqual(self.titles(q="cher"), ["Cherry"])
        self.assertEqual(self.titles(q="history"), ["Apple"])
        self.assertEqual(
            self.titles(q="ann lee", ordering="title"), ["Apple", "Banana"]
        )

    def test_each_filter_takes_several_values(self):
        self.assertEqual(
            self.titles(status=["draft", "approved"], ordering="title"),
            ["Apple", "Cherry"],
        )
        self.assertEqual(self.titles(faculty=["Arts"]), ["Apple"])
        self.assertEqual(
            self.titles(department=["Physics"], owner=["ann@unimelb.edu.au"]),
            ["Banana"],
        )

    def test_no_budget_is_a_status_to_filter_on(self):
        Budget.objects.filter(project=self.apple).delete()
        # Nobody but its owner can see a project with no budget.
        self.assertEqual(self.titles(status=["none"]), [])

        self.client.force_login(self.ann)
        self.assertEqual(self.titles(status=["none"]), ["Apple"])

    def test_the_filters_list_what_the_caller_can_see(self):
        self.client.force_login(self.ann)
        body = self.client.get(reverse("project-filters")).json()

        self.assertEqual(
            body["status"],
            [{"value": "dean_review", "count": 1}, {"value": "draft", "count": 1}],
        )
        self.assertEqual(
            body["faculty"],
            [{"value": "Arts", "count": 1}, {"value": "Science", "count": 1}],
        )
        self.assertEqual(
            body["owner"],
            [{"value": "ann@unimelb.edu.au", "label": "Ann Lee", "count": 2}],
        )

    def test_each_filter_is_counted_against_the_search_and_the_others(self):
        body = self.client.get(
            reverse("project-filters"), {"q": "an", "faculty": ["Science"]}
        ).json()

        # Banana alone matches both; the faculty menu ignores its own pick.
        counts = {o["value"]: o["count"] for o in body["status"]}
        self.assertEqual(counts, {"approved": 0, "dean_review": 1, "draft": 0})
        counts = {o["value"]: o["count"] for o in body["faculty"]}
        self.assertEqual(counts, {"Arts": 1, "Science": 1})

    def test_one_project_by_id_only_if_visible(self):
        self.client.force_login(self.ann)
        mine = self.client.get(reverse("project-detail", args=[self.apple.id]))
        theirs = self.client.get(reverse("project-detail", args=[self.cherry.id]))

        self.assertEqual(mine.json()["title"], "Apple")
        self.assertEqual(theirs.status_code, 404)

    def test_the_console_register_narrows_to_a_department(self):
        self.assertEqual(
            self.titles(
                "/api/admin/projects/", department_code="SCI", status=["dean_review"]
            ),
            ["Banana"],
        )
