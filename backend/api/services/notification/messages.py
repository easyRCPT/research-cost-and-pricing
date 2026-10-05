from abc import ABC, abstractmethod

from django.conf import settings
from django.utils import timezone

from api.models import ApprovalStep, Budget, User

from . import recipients

# Same wording as the approvals screen (frontend/src/screens/approvals/triggers.ts).
TRIGGER_TEXT = {
    "margin_below_minimum": "The margin is below the University's minimum.",
    "in_kind_present": "The University is contributing costs in kind.",
}


class Notification(ABC):
    """One email: who gets it, its subject, and the template and context it renders."""

    template: str

    @abstractmethod
    def recipients(self) -> list[str]: ...

    @abstractmethod
    def subject(self) -> str: ...

    @abstractmethod
    def context(self) -> dict: ...


class BudgetNotification(Notification):
    """An email about one costing, linking to its approvals screen."""

    def __init__(self, budget: Budget) -> None:
        self.budget = budget

    @property
    def title(self) -> str:
        return self.budget.project.title or "Untitled project"

    def context(self) -> dict:
        return {
            "budget": self.budget,
            "project": self.budget.project,
            "title": self.title,
            "url": approvals_url(self.budget),
            "timeline": timeline(self.budget),
        }


class HodReview(BudgetNotification):
    template = "budget_hod_review"

    def recipients(self) -> list[str]:
        return recipients.hods(self.budget)

    def subject(self) -> str:
        return f"Approval needed: {self.title}"


class DeanReview(BudgetNotification):
    template = "budget_dean_review"

    def recipients(self) -> list[str]:
        return recipients.deans(self.budget)

    def subject(self) -> str:
        return f"Dean approval needed: {self.title}"

    def context(self) -> dict:
        triggers = [TRIGGER_TEXT.get(code, code) for code in self.budget.dean_triggers]
        return {**super().context(), "triggers": triggers}


class Decision(BudgetNotification):
    template = "budget_decision"

    def __init__(
        self, budget: Budget, *, decision: str, comment: str, approver: User
    ) -> None:
        super().__init__(budget)
        self.decision = decision
        self.comment = comment
        self.approver = approver

    @property
    def requires_dean_review(self) -> bool:
        return self.budget.status == Budget.Status.DEAN_REVIEW

    @property
    def heading(self) -> str:
        if self.decision == "reject":
            return "Rejected"
        if self.requires_dean_review:
            return "Approved by your Head of Department"
        return "Approved"

    def recipients(self) -> list[str]:
        return recipients.owner(self.budget)

    def subject(self) -> str:
        return f"{self.heading}: {self.title}"

    def context(self) -> dict:
        return {
            **super().context(),
            "heading": self.heading,
            "decision": self.decision,
            "comment": self.comment,
            "approver": self.approver,
            "requires_dean_review": self.requires_dean_review,
        }


class Withdrawn(BudgetNotification):
    template = "budget_withdrawn"

    def __init__(self, budget: Budget, *, levels: list[str]) -> None:
        super().__init__(budget)
        self.levels = levels

    def recipients(self) -> list[str]:
        emails: list[str] = []
        if "department" in self.levels:
            emails += recipients.hods(self.budget)
        if "faculty" in self.levels:
            emails += recipients.deans(self.budget)
        return sorted(set(emails))

    def subject(self) -> str:
        return f"Withdrawn: {self.title}"

    def context(self) -> dict:
        context = super().context()
        # Withdrawal has no step of its own, and the email goes out as it happens.
        context["timeline"].append(
            {
                "label": "Withdrawn",
                "state": "withdrawn",
                "at": timezone.now(),
                "by": self.budget.project.created_by.display_name,
            }
        )
        return context


def timeline(budget: Budget) -> list[dict]:
    """The submission and each approval step that applies, in order, for the email's progress list."""
    entries = [
        {
            "label": "Submitted for approval",
            "state": "approved",
            "at": budget.submitted_at,
            "by": budget.project.created_by.display_name,
        }
    ]
    steps = (
        budget.approval_steps.exclude(status=ApprovalStep.Status.NOT_REQUIRED)
        .select_related("decided_by")
        .order_by("id")
    )
    for step in steps:
        entries.append(
            {
                "label": f"{step.get_level_display()} approval",
                "state": step.status,
                "at": step.decided_at,
                "by": step.decided_by.display_name if step.decided_by else "",
                "comment": step.comment,
            }
        )
    return entries


def approvals_url(budget: Budget) -> str:
    """The costing's approvals screen, where approvers decide and owners see the outcome."""
    return f"{settings.FRONTEND_URL}/projects/{budget.project_id}/approvals"


class SignupConfirmation(Notification):
    """The link a new account clicks to prove it owns its address."""

    template = "signup_confirm"

    def __init__(self, user: User, *, url: str) -> None:
        self.user = user
        self.url = url

    def recipients(self) -> list[str]:
        return [self.user.email]

    def subject(self) -> str:
        return "Confirm your email for easyRCPT"

    def context(self) -> dict:
        return {"title": self.subject(), "user": self.user, "url": self.url}
