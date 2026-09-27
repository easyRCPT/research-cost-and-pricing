from django.test import TestCase

from api.models import AuditLog, User
from api.services.audit import write_audit


class WriteAuditTest(TestCase):
    @classmethod
    def setUpTestData(cls) -> None:
        cls.user = User.objects.create_user(
            email="user@example.com",
            password="password",
        )

    def test_write_audit_creates_log(self) -> None:
        write_audit(
            actor=self.user,
            action="admin.user.update",
            object_type="auth_user",
            object_id=str(self.user.id),
            detail={
                "first_name": {
                    "old": "John",
                    "new": "Jack",
                }
            },
        )

        log = AuditLog.objects.get()

        self.assertEqual(
            log.actor,
            self.user,
        )
        self.assertEqual(
            log.action,
            "admin.user.update",
        )
        self.assertEqual(
            log.object_type,
            "auth_user",
        )
        self.assertEqual(
            log.object_id,
            str(self.user.id),
        )
        self.assertEqual(
            log.detail,
            {
                "first_name": {
                    "old": "John",
                    "new": "Jack",
                }
            },
        )

    def test_write_audit_without_detail_uses_empty_dict(self) -> None:
        write_audit(
            actor=self.user,
            action="admin.user.activate",
            object_type="auth_user",
            object_id=str(self.user.id),
        )

        log = AuditLog.objects.get()

        self.assertEqual(
            log.detail,
            {},
        )

    def test_write_audit_allows_null_actor(self) -> None:
        write_audit(
            actor=None,
            action="admin.user.deactivate",
            object_type="auth_user",
            object_id="1",
        )

        log = AuditLog.objects.get()

        self.assertIsNone(
            log.actor,
        )

        self.assertEqual(
            log.action,
            "admin.user.deactivate",
        )

    def test_write_audit_supports_string_object_id(self) -> None:
        write_audit(
            actor=self.user,
            action="admin.lookup.insert",
            object_type="salary_rate",
            object_id="PROFESSOR_LEVEL_1",
            detail={
                "rate": {
                    "old": None,
                    "new": "120.50",
                }
            },
        )

        log = AuditLog.objects.get()

        self.assertEqual(
            log.object_id,
            "PROFESSOR_LEVEL_1",
        )
        self.assertEqual(
            log.object_type,
            "salary_rate",
        )

    def test_write_audit_creates_multiple_entries(self) -> None:
        write_audit(
            actor=self.user,
            action="admin.user.update",
            object_type="auth_user",
            object_id=str(self.user.id),
        )

        write_audit(
            actor=self.user,
            action="admin.user.groups",
            object_type="auth_user",
            object_id=str(self.user.id),
        )

        self.assertEqual(
            AuditLog.objects.count(),
            2,
        )
