from abc import ABC, abstractmethod

from django.conf import settings

from api.models import Budget, User

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


def approvals_url(budget: Budget) -> str:
    """The costing's approvals screen, where approvers decide and owners see the outcome."""
    return f"{settings.FRONTEND_URL}/projects/{budget.project_id}/approvals"
