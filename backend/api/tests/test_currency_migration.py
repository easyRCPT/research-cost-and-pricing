from decimal import Decimal

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

BEFORE = ("api", "0038_currency")
SEED_CURRENCIES = ("api", "0039_seed_currencies")


class CurrencyMigrationTests(TransactionTestCase):
    """
    A database that already holds rates gains the workbook's currencies in its
    current version (0039). An empty one is left for the seed, whose rows would
    otherwise collide with them.
    """

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([target])
        return executor.loader.project_state([target]).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def current_version(self, apps, *, with_rates: bool) -> int:
        LookupVersion = apps.get_model("api", "LookupVersion")
        LookupConfiguration = apps.get_model("api", "LookupConfiguration")
        version = LookupVersion.objects.create()
        LookupConfiguration.objects.update_or_create(
            pk=1, defaults={"current_version": version}
        )
        if with_rates:
            apps.get_model("api", "SalaryRate").objects.create(
                version=version,
                payroll_type="Fortnight",
                category="Academic",
                classification="Level A.1",
                rate=Decimal(100000),
            )
        return version.id

    def test_a_version_holding_rates_gains_the_currencies(self):
        apps = self.migrate(BEFORE)
        version_id = self.current_version(apps, with_rates=True)

        apps = self.migrate(SEED_CURRENCIES)

        currencies = apps.get_model("api", "Currency").objects.filter(
            version_id=version_id
        )
        self.assertEqual(currencies.count(), 21)
        self.assertEqual(currencies.get(code="USD").rate, Decimal("0.70285"))
        self.assertEqual(currencies.get(code="AUD").rate, Decimal(1))

    def test_an_empty_version_is_left_for_the_seed(self):
        apps = self.migrate(BEFORE)
        version_id = self.current_version(apps, with_rates=False)

        apps = self.migrate(SEED_CURRENCIES)

        self.assertFalse(
            apps.get_model("api", "Currency")
            .objects.filter(version_id=version_id)
            .exists()
        )
