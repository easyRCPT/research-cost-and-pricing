from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = "api"

    def ready(self):
        # Importing registers the check. Kept here rather than at module level
        # so it is picked up exactly once, after the app registry is populated.
        from . import checks  # noqa: F401
