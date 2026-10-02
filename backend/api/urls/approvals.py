from django.urls import path

from api.views import approvals

urlpatterns = [
    # Approvals
    path(
        "queue/",
        approvals.ApprovalView.as_view(http_method_names=["get"]),
        name="approvals-queue",
    ),
    path(
        "<int:step_id>/decide/",
        approvals.ApprovalDecideView.as_view(http_method_names=["post"]),
        name="approvals-decide",
    ),
]
