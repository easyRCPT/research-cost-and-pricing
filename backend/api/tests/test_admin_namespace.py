"""
Nothing under /api/admin/ is reachable without the superadmin group (#63).

Walks the namespace's own URLconf rather than listing views by hand, so a view
added to it later without `IsSuperadmin` fails here instead of shipping open.
"""

from django.test import SimpleTestCase
from django.urls import URLPattern, URLResolver

from api.permissions import IsSuperadmin
from api.urls import admin


def views_in(patterns) -> list[type]:
    found = []
    for pattern in patterns:
        if isinstance(pattern, URLResolver):
            found += views_in(pattern.url_patterns)
        elif isinstance(pattern, URLPattern):
            view = getattr(pattern.callback, "view_class", None)
            if view is not None:
                found.append(view)
    return found


class AdminNamespaceTest(SimpleTestCase):
    def test_every_admin_view_requires_the_superadmin_group(self):
        views = views_in(admin.urlpatterns)
        self.assertTrue(views, "the admin namespace has no views to check")

        for view in views:
            with self.subTest(view=view.__name__):
                self.assertIn(IsSuperadmin, getattr(view, "permission_classes", []))

    def test_the_check_notices_an_unguarded_view(self):
        from django.urls import path
        from rest_framework.views import APIView

        class Forgotten(APIView):
            pass

        unguarded = views_in([path("x/", Forgotten.as_view())])[0]
        self.assertNotIn(IsSuperadmin, getattr(unguarded, "permission_classes", []))
