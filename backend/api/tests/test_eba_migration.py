from decimal import Decimal

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

BEFORE_RATES = ("api", "0031_nonstaffcostcategory_excludes_additional_rate_and_more")
BEFORE_FILL = ("api", "0033_remove_ebaincrease_unique_eba_increase_and_more")
FILL = ("api", "0034_fill_eba_rates_and_salary_rate_year")

# The seed's multipliers before 0032: 3% a year from 2025, rounded to six
# places, which leaves noise in a rate worked back from two of them (2042).
SEEDED = {
    2025: "1.000000",
    2026: "1.030000",
    2027: "1.060900",
    2028: "1.092727",
    2029: "1.125509",
    2030: "1.159274",
    2031: "1.194052",
    2032: "1.229874",
    2033: "1.266770",
    2034: "1.304773",
    2035: "1.343916",
    2036: "1.384234",
    2037: "1.425761",
    2038: "1.468534",
    2039: "1.512590",
    2040: "1.557967",
    2041: "1.604706",
    2042: "1.652848",
    2043: "1.702433",
}


class EbaMigrationTests(TransactionTestCase):
    """
    Existing lookup versions keep their EBA increases through the move from
    multipliers to rates, and every version gains salary_rate_year (0032-0034).
    """

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([target])
        return executor.loader.project_state([target]).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def version_with_multipliers(self, apps, multipliers):
        version = apps.get_model("api", "LookupVersion").objects.create()
        # A version in use holds constants as well, which is what 0034 looks
        # for before filling one.
        apps.get_model("api", "CalculationConstant").objects.create(
            version=version, name="gst_rate", value=Decimal("0.1")
        )
        EbaIncrease = apps.get_model("api", "EbaIncrease")
        for year, multiplier in multipliers.items():
            EbaIncrease.objects.create(
                version=version, year=year, multiplier=Decimal(multiplier)
            )
        return version.id

    def rates(self, apps, version_id):
        rows = apps.get_model("api", "EbaIncrease").objects.filter(
            version_id=version_id
        )
        return {row.year: row.rate for row in rows.order_by("year")}

    def test_seeded_multipliers_become_one_three_percent_rate(self):
        apps = self.migrate(BEFORE_RATES)
        version_id = self.version_with_multipliers(apps, SEEDED)

        apps = self.migrate(FILL)

        self.assertEqual(self.rates(apps, version_id), {2026: Decimal("0.030000")})

    def test_a_changed_rate_is_kept_from_the_year_it_changes(self):
        apps = self.migrate(BEFORE_RATES)
        edited = {year: SEEDED[year] for year in range(2025, 2029)}
        edited[2029] = "1.136436"  # 4% over 2028
        edited[2030] = "1.170529"  # back to 3%
        version_id = self.version_with_multipliers(apps, edited)

        apps = self.migrate(FILL)

        self.assertEqual(
            self.rates(apps, version_id),
            {
                2026: Decimal("0.030000"),
                2029: Decimal("0.040000"),
                2030: Decimal("0.030000"),
            },
        )

    def test_every_version_gains_salary_rate_year(self):
        apps = self.migrate(BEFORE_RATES)
        version_id = self.version_with_multipliers(apps, SEEDED)

        apps = self.migrate(FILL)

        constant = apps.get_model("api", "CalculationConstant").objects.get(
            version_id=version_id, name="salary_rate_year"
        )
        self.assertEqual(constant.value, Decimal(2025))

    def test_a_version_emptied_by_the_first_cut_of_0032_is_refilled(self):
        apps = self.migrate(BEFORE_FILL)
        version = apps.get_model("api", "LookupVersion").objects.create()
        apps.get_model("api", "CalculationConstant").objects.create(
            version=version, name="gst_rate", value=Decimal("0.1")
        )

        apps = self.migrate(FILL)

        self.assertEqual(self.rates(apps, version.id), {2026: Decimal("0.030000")})

    def test_a_version_with_no_rates_is_left_empty_for_the_seed(self):
        apps = self.migrate(BEFORE_FILL)
        version_id = apps.get_model("api", "LookupVersion").objects.create().id

        apps = self.migrate(FILL)

        self.assertEqual(self.rates(apps, version_id), {})
        self.assertFalse(
            apps.get_model("api", "CalculationConstant")
            .objects.filter(version_id=version_id)
            .exists()
        )

    def test_a_version_that_has_its_rows_is_left_alone(self):
        apps = self.migrate(BEFORE_FILL)
        version = apps.get_model("api", "LookupVersion").objects.create()
        apps.get_model("api", "EbaIncrease").objects.create(
            version=version, year=2027, rate=Decimal("0.05")
        )
        apps.get_model("api", "CalculationConstant").objects.create(
            version=version, name="salary_rate_year", value=Decimal(2026)
        )

        apps = self.migrate(FILL)

        self.assertEqual(self.rates(apps, version.id), {2027: Decimal("0.050000")})
        constant = apps.get_model("api", "CalculationConstant").objects.get(
            version_id=version.id, name="salary_rate_year"
        )
        self.assertEqual(constant.value, Decimal(2026))
