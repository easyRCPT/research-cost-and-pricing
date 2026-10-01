"""
Costings waiting on a role nobody holds (#121): found, and freed by assigning
someone, with nothing re-routed.
"""

from django.contrib.auth.models import Group
from django.urls import reverse

from api.models import ApprovalStep, Budget, UserOrgAssignment
from api.services.approval_decide import decide
from api.services.admin_users import update_user
from api.services.approval_queue import get_approval_steps
from api.services.approver_gaps import gaps, stranded
from api.services.submission import submit_budget

from .test_approval_flow import FlowFixture

BELOW_THE_FLOOR = "0.10"  # the fixture's minimum margin is 0.20: needs the dean


class ApproverGapsTest(FlowFixture):
    def submitted(self, margin: str = "0.30") -> Budget:
        budget = self.a_budget(margin)
        submit_budget(self.owner, budget)
        budget.refresh_from_db()
        return budget

    def stranded_ids(self) -> list[int]:
        return [row["budget_id"] for row in stranded()]

    def test_a_costing_whose_department_has_no_head_is_stranded(self):
        UserOrgAssignment.objects.filter(role="hod").delete()

        budget = self.submitted()

        [row] = stranded()
        self.assertEqual(row["budget_id"], budget.id)
        self.assertEqual(row["level"], "department")
        self.assertEqual(row["unit"], self.department.name)

    def test_assigning_a_head_frees_it_with_nothing_else_done(self):
        UserOrgAssignment.objects.filter(role="hod").delete()
        budget = self.submitted()
        step = budget.approval_steps.get(level=ApprovalStep.Level.DEPARTMENT)

        UserOrgAssignment.objects.create(
            user=self.hod, role="hod", department=self.department
        )

        self.assertEqual(self.stranded_ids(), [])
        self.assertEqual([s.id for s in get_approval_steps(self.hod)], [step.id])
        step.refresh_from_db()
        self.assertEqual(step.status, ApprovalStep.Status.PENDING)

    def test_a_head_who_loses_staff_leaves_the_costing_waiting(self):
        budget = self.submitted()
        step = budget.approval_steps.get(level=ApprovalStep.Level.DEPARTMENT)

        update_user(self.dean, self.hod, {"groups": ["researcher"]})

        self.assertEqual(self.stranded_ids(), [budget.id])
        self.assertEqual(get_approval_steps(self.hod), [])
        step.refresh_from_db()
        self.assertEqual(step.status, ApprovalStep.Status.PENDING)

    def test_a_costing_waiting_on_a_missing_dean_is_reported_the_same_way(self):
        UserOrgAssignment.objects.filter(role="dean").delete()
        budget = self.submitted(BELOW_THE_FLOOR)
        decide(
            self.hod,
            budget.approval_steps.get(level=ApprovalStep.Level.DEPARTMENT).id,
            "approve",
            "",
        )

        [row] = stranded()
        self.assertEqual(row["budget_id"], budget.id)
        self.assertEqual(row["level"], "faculty")
        self.assertEqual(row["unit"], self.faculty.name)

    def test_an_owner_who_is_the_only_head_does_not_count(self):
        UserOrgAssignment.objects.filter(role="hod").delete()
        UserOrgAssignment.objects.create(
            user=self.owner, role="hod", department=self.department
        )

        budget = self.submitted()

        self.assertEqual(self.stranded_ids(), [budget.id])

    def test_deactivating_the_only_head_strands_it(self):
        budget = self.submitted()
        self.assertEqual(self.stranded_ids(), [])

        self.hod.is_active = False
        self.hod.save(update_fields=["is_active"])

        self.assertEqual(self.stranded_ids(), [budget.id])

    def test_a_costing_someone_can_decide_is_not_stranded(self):
        self.submitted()

        self.assertEqual(self.stranded_ids(), [])

    def test_units_with_nobody_to_sign_are_listed(self):
        UserOrgAssignment.objects.filter(role="dean").delete()

        found = gaps()

        self.assertNotIn(self.department.code, found["departments_without_head"])
        self.assertIn(self.faculty.code, found["faculties_without_dean"])

    def test_only_a_superadmin_may_ask(self):
        self.client.force_login(self.owner)
        self.assertEqual(
            self.client.get(reverse("admin-approver-gaps")).status_code, 403
        )

        self.owner.groups.set(Group.objects.filter(name="superadmin"))
        self.assertEqual(
            self.client.get(reverse("admin-approver-gaps")).status_code, 200
        )
