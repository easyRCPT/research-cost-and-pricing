from collections.abc import Callable

from django.db.models import Count

from api.models import User


def emails_to_names(emails) -> dict[str, str]:
    return {u.email: u.display_name for u in User.objects.filter(email__in=emails)}


def facets(
    narrow: Callable[..., object],
    query: dict,
    fields: dict[str, str],
    none: dict[str, str] | None = None,
    labels: dict[str, Callable[[list[str]], dict[str, str]]] | None = None,
) -> dict[str, list[dict]]:
    """
    Each filter's values across every row `narrow()` gives, each counted against
    the search and every other filter in `query`, as the table counted them
    when it held every row. `fields` maps a filter to the field it reads,
    `none` names the value a null stands for, and `labels` names the values.
    """
    none = none or {}
    labels = labels or {}
    everything = narrow()
    found = {}
    for name, field in fields.items():
        others = {key: value for key, value in query.items() if key != name}
        counts = dict(
            narrow(**others).order_by().values_list(field).annotate(n=Count("pk"))
        )
        values = everything.order_by().values_list(field, flat=True).distinct()
        named = labels[name]([v for v in values if v]) if name in labels else {}
        options = [
            {
                "value": none.get(name, "") if value is None else value,
                **({"label": named[value]} if value in named else {}),
                "count": counts.get(value, 0),
            }
            for value in set(values)
            if value is not None or name in none
        ]
        found[name] = sorted(
            options, key=lambda o: o.get("label", o["value"]).casefold()
        )
    return found
