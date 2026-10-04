from decimal import Decimal

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

BEFORE = ("api", "0043_remove_indirect_rate_multiplier")
AFTER = ("api", "0044_staff_line_is_ci")


class CiLineMigrationTests(TransactionTestCase):
    """
    Existing costings keep what was meant (0044): the first line is marked as
    the CI's only where its saved name already is the CI's.
    """

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate([target])
        return executor.loader.project_state([target]).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())

    def costing(self, apps, ci: str, first_name: str) -> int:
        owner = apps.get_model("api", "User").objects.create(
            email=f"{first_name.replace(' ', '')}@unimelb.edu.au"
        )
        project = apps.get_model("api", "Project").objects.create(
            title="Costing",
            chief_investigator=ci,
            start_year=2027,
            start_month=1,
            created_by=owner,
        )
        budget = apps.get_model("api", "Budget").objects.create(
            project=project,
            cost_multiplier=Decimal("1.70"),
            in_kind_multiplier=Decimal("1.70"),
            margin=Decimal("0.30"),
        )
        Line = apps.get_model("api", "StaffCostLine")
        for position, name in enumerate((first_name, "Second person")):
            Line.objects.create(
                budget=budget,
                position=position,
                name_role=name,
                employment_type="Continuing",
                category="Academic",
                classification="Level B.1",
                time_basis="FTE",
            )
        return budget.id

    def marked(self, apps, budget_id: int) -> list[str]:
        return list(
            apps.get_model("api", "StaffCostLine")
            .objects.filter(budget_id=budget_id, is_ci=True)
            .values_list("name_role", flat=True)
        )

    def test_the_first_line_is_marked_where_it_is_the_ci(self):
        apps = self.migrate(BEFORE)
        budget = self.costing(
            apps, ci="Prof Ada Lovelace", first_name=" prof ada lovelace"
        )

        apps = self.migrate(AFTER)

        self.assertEqual(self.marked(apps, budget), [" prof ada lovelace"])

    def test_someone_elses_first_line_is_left_alone(self):
        apps = self.migrate(BEFORE)
        budget = self.costing(
            apps, ci="Prof Ada Lovelace", first_name="Dr Someone Else"
        )

        apps = self.migrate(AFTER)

        self.assertEqual(self.marked(apps, budget), [])
