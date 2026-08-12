# Seeds

Reference data loaded by `make seed` (and automatically by `make db-reset`).

This is for **lookup tables** — funding bodies, salary scales, indexation rates,
institution lists. Data the application is wrong without, in every environment.
It is not sample or test data: fixtures under an app's `fixtures/` directory are
the right home for that.

## Rules

**Files run in filename order.** Number them, and leave gaps:

```
0010_funding_bodies.sql
0020_salary_scales.sql
0030_indexation_rates.py
```

Order is the only way to express a dependency — a table must be seeded after
whatever its foreign keys point at. The gaps let you slot a file in later
without renaming everything after it.

**Every file must be idempotent.** `make seed` keeps no ledger of what it has
run; it re-runs everything, every time, on every environment. Write upserts:

```sql
insert into api_fundingbody (code, name)
values ('arc', 'Australian Research Council')
on conflict (code) do update set name = excluded.name;
```

```python
def run():
    from api.models import FundingBody
    FundingBody.objects.update_or_create(
        code="arc", defaults={"name": "Australian Research Council"}
    )
```

A bare `INSERT` will fail the second time and take `make db-reset` with it.

**`.py` files must define `run()`**, which takes no arguments. Use one when the
data needs logic — deriving rows, reading a CSV, calling out to a scraper's
output. Use `.sql` for bulk reference data; it is faster and diffs better.

Each file runs in its own transaction, so a failure rolls that file back rather
than leaving a table half-populated.

## Generated files

If a seed is produced by a script rather than hand-written, say so at the top of
the file — what generated it, how to regenerate it, and when it was last run.
Nobody can tell a generated 200 KB SQL file from a hand-maintained one by
looking, and the difference decides whether editing it is reasonable.

## Commands

```bash
make seed                              # run everything
make db-reset                          # wipe, migrate, then seed
cd backend && uv run python manage.py seed --list          # dry run
cd backend && uv run python manage.py seed --only salary   # just matching files
```
