from api.models import Budget, User

from .messages import DeanReview, Decision, HodReview, Withdrawn
from .sender import send


def notify_hod_review(budget: Budget) -> None:
    """Tell the HoDs a costing is waiting on them."""
    send(HodReview(budget))


def notify_dean_review(budget: Budget) -> None:
    """Tell the Deans a costing is waiting on them, and why."""
    send(DeanReview(budget))


def notify_budget_decision(
    budget: Budget, *, decision: str, comment: str = "", approver: User
) -> None:
    """Tell the owner an approver has decided."""
    send(Decision(budget, decision=decision, comment=comment, approver=approver))


def notify_withdrawn(budget: Budget, *, levels: list[str]) -> None:
    """Tell the approvers it was waiting on that it has been withdrawn (#95)."""
    send(Withdrawn(budget, levels=levels))
