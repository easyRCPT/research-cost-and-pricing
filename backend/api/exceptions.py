from django.core.exceptions import ValidationError as DjangoValidationError
from drf_standardized_errors.handler import ExceptionHandler as StandardizedHandler
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.fields import get_error_detail


class ExceptionHandler(StandardizedHandler):
    """
    Treat model validation as a bad request rather than a server error.

    The services validate with full_clean() before saving, which raises
    Django's ValidationError. DRF does not recognise that one, so a blank title
    or a figure outside its field's range came back as a 500 with an HTML
    traceback and no field named -- and the browser could only say that
    something had not saved.

    Converting it here covers every path that validates a model, rather than
    the one service that happened to be reached, and keeps the response in the
    same envelope drf-standardized-errors produces for every other error.

    This subclasses the handler rather than wrapping the handler function,
    which is the seam the package intends -- convert_known_exceptions is where
    it converts Django's own Http404 and PermissionDenied. It also has to be:
    the schema generator decides whether to document a view's error responses
    by comparing that view's handler against its own *by identity*
    (drf_standardized_errors/openapi.py, _should_add_error_response). A
    handler of our own, however thin, fails that check, and every documented
    error response silently leaves the schema -- which is 1771 lines of error
    types out of frontend/src/types/api.d.ts, caught by CI's type drift gate.
    """

    def convert_known_exceptions(self, exc: Exception) -> Exception:
        if isinstance(exc, DjangoValidationError):
            return DRFValidationError(detail=get_error_detail(exc))
        return super().convert_known_exceptions(exc)
