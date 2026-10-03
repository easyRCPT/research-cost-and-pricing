from rest_framework.exceptions import ValidationError
from rest_framework.pagination import CursorPagination


class Paged(CursorPagination):
    """Cursor pages sized by `?limit=`."""

    page_size = 50
    page_size_query_param = "limit"
    max_page_size = 500


class NewestFirst(Paged):
    ordering = ("-created_at", "-id")


class ByName(Paged):
    ordering = ("name", "pk")


class Sorted(Paged):
    """
    Cursor pages in the order `?ordering=` names, `-` first for descending.
    The view lists what it sorts by in `orderings`, either names or a map of
    name to field, and its default in `ordering`. The cursor keys on that one
    field, so it must never be null.
    """

    def get_ordering(self, request, queryset, view):
        asked = request.query_params.get("ordering") or view.ordering
        name = asked.lstrip("-")
        if name not in view.orderings:
            raise ValidationError(
                {"ordering": f"Sort by one of {', '.join(view.orderings)}."}
            )
        field = view.orderings[name] if isinstance(view.orderings, dict) else name
        if asked.startswith("-"):
            return (f"-{field}", "-id")
        return (field, "id")
