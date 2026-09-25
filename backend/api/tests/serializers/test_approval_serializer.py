from datetime import UTC, datetime
from decimal import Decimal

from django.test import TestCase

from api.models import (
    ApprovalStep,
    Budget,
    Department,
    Faculty,
    LookupVersion,
    Project,
    User,
)
from api.serializers.approval_serializer import ApprovalQueueSerializer


class ApprovalQueueSerializerTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.lookup_version = LookupVersion.objects.create()

        faculty = Faculty.objects.create(
            code="SCI",
            name="Science Faculty",
        )

        department = Department.objects.create(
            code="SCI",
            name="Science",
            school="Science School",
            school_code="SCI",
            faculty=faculty,
        )

        user = User.objects.create(
            email="owner@unimelb.edu.au",
        )

        project = Project.objects.create(
            title="Test Project",
            department=department,
            chief_investigator="Test Investigator",
            funder="Test Funder",
            start_year=2025,
            start_month=1,
            end_year=2026,
            end_month=12,
            created_by=user,
        )

        cls.budget = Budget.objects.create(
            project=project,
            lookup_version=cls.lookup_version,
            cost_multiplier=Decimal("1.0"),
            in_kind_multiplier=Decimal("1.0"),
            margin=Decimal("0.30"),
            gst_applicable=True,
            cash_co_contribution=Decimal(0),
            total_price_inc_gst=Decimal("412300.00"),
            submitted_at=datetime(
                2026,
                9,
                1,
                4,
                11,
                tzinfo=UTC,
            ),
            dean_triggers=["margin_below_minimum"],
        )

        cls.approval_step = ApprovalStep.objects.create(
            budget=cls.budget,
            level=ApprovalStep.Level.FACULTY,
            status=ApprovalStep.Status.PENDING,
        )

    def test_serializes_approval_queue_item(self) -> None:
        serializer = ApprovalQueueSerializer(self.approval_step)

        expected = {
            "step_id": self.approval_step.id,
            "level": "faculty",
            "budget": {
                "id": self.budget.id,
                "project_title": "Test Project",
                "department": "Science",
                "faculty": "Science Faculty",
                "chief_investigator": "Test Investigator",
                "total_price_inc_gst": Decimal("412300.00"),
                "margin": Decimal("0.3000"),
                "submitted_at": "2026-09-01T14:11:00+10:00",
            },
            "dean_triggers": ["margin_below_minimum"],
        }

        self.assertEqual(serializer.data, expected)
