"""
The approver's register (#98): every project in the caller's scope, decided or
not, from GET /api/projects/, filterable by status.
"""

from django.contrib.auth.models import Group
from django.urls import reverse

from api.models import ApprovalStep, Budget, User
from api.services.approval_decide import decide
from api.services.submission import submit_budget
from api.tests.services.test_approval_flow import FlowFixture


class ApproverRegisterTest(FlowFixture):
    def setUp(self):
        super().setUp()
        self.approved = self.a_budget("0.30")
        submit_budget(self.owner, self.approved)
        decide(
            self.hod,
            self.approved.approval_steps.get(level=ApprovalStep.Level.DEPARTMENT).id,
            "approve",
            "",
        )
        self.waiting = self.a_budget("0.30")
        submit_budget(self.owner, self.waiting)
        self.draft = self.a_budget("0.30")

    def rows(self, user: User, status: str | None = None):
        self.client.force_login(user)
        query = {} if status is None else {"status": status}
        return self.client.get(reverse("projects"), query)

    def ids(self, response) -> set[int]:
        return {row["id"] for row in response.json()}

    def test_the_head_of_department_sees_every_submitted_project_in_their_area(self):
        response = self.rows(self.hod)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            self.ids(response), {self.approved.project_id, self.waiting.project_id}
        )

    def test_each_row_says_who_submitted_it(self):
        [row] = [
            row
            for row in self.rows(self.hod).json()
            if row["id"] == self.approved.project_id
        ]

        self.assertEqual(row["owner"]["email"], self.owner.email)
        self.assertEqual(row["status"], "approved")

    def test_a_status_filters_on_the_server(self):
        response = self.rows(self.hod, "approved")

        self.assertEqual(self.ids(response), {self.approved.project_id})

    def test_an_unknown_status_is_refused(self):
        response = self.rows(self.hod, "finished")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["errors"][0]["attr"], "status")

    def test_a_project_with_several_budgets_appears_once_with_its_latest(self):
        later = Budget.objects.create(
            project=self.approved.project,
            cost_multiplier=self.approved.cost_multiplier,
            in_kind_multiplier=self.approved.in_kind_multiplier,
            margin=self.approved.margin,
        )
        submit_budget(self.owner, later)

        rows = [
            row
            for row in self.rows(self.hod).json()
            if row["id"] == self.approved.project_id
        ]

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["budget_id"], later.id)
        self.assertEqual(rows[0]["status"], "hod_review")

    def test_a_researcher_sees_only_their_own(self):
        other = User.objects.create(email="other@unimelb.edu.au")
        other.groups.set(Group.objects.filter(name="researcher"))

        self.assertEqual(self.ids(self.rows(other)), set())
        self.assertEqual(
            self.ids(self.rows(self.owner)),
            {
                self.approved.project_id,
                self.waiting.project_id,
                self.draft.project_id,
            },
        )

    def test_staff_with_no_assignment_sees_nothing(self):
        staff = User.objects.create(email="staff@unimelb.edu.au")
        staff.groups.set(Group.objects.filter(name="staff"))

        self.assertEqual(self.rows(staff).json(), [])
