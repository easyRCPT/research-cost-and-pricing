from django.core.exceptions import ValidationError as DjangoValidationError
from drf_standardized_errors.handler import (
    exception_handler as standardized_exception_handler,
)
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.fields import get_error_detail


def exception_handler(exc, context):
    """
    Treat model validation as a bad request rather than a server error.

    The services validate with full_clean() before saving, which raises
    Django's ValidationError. DRF does not recognise that one, so a blank title
    or a figure outside its field's range came back as a 500 with an HTML
    traceback and no field named -- and the browser could only say that
    something had not saved.

    Translating it here covers every path that validates a model, rather than
    the one service that happened to be reached, and keeps the response in the
    same envelope drf-standardized-errors produces for every other error.
    """
    if isinstance(exc, DjangoValidationError):
        exc = DRFValidationError(detail=get_error_detail(exc))

    return standardized_exception_handler(exc, context)
