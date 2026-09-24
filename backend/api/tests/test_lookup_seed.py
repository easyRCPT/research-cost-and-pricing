"""
The lookup seed runs on every Render deploy, so it must never touch a database
that already has lookups.
"""

from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from api.models import Department, LookupConfiguration, LookupVersion, SalaryRate


def seed_lookups():
    call_command("seed", "--only", "lookups", stdout=StringIO())


class TestLookupSeed(TestCase):
    def test_loads_into_an_empty_database(self):
        seed_lookups()

        self.assertTrue(SalaryRate.objects.exists())
        self.assertTrue(Department.objects.exists())

    def test_leaves_a_populated_database_alone(self):
        seed_lookups()

        config = LookupConfiguration.objects.get()
        config.current_version = LookupVersion.objects.create()
        config.referenced = True
        config.save()

        department = Department.objects.order_by("code").first()
        assert department is not None
        department.name = "Renamed"
        department.save()

        seed_lookups()

        config.refresh_from_db()
        department.refresh_from_db()
        self.assertNotEqual(config.current_version_id, 1)
        self.assertTrue(config.referenced)
        self.assertEqual(department.name, "Renamed")
