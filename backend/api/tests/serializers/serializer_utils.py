from typing import cast


def get_errors(serializer) -> dict:
    return cast(dict, serializer.errors)


def get_validated_data(serializer) -> dict:
    return cast(dict, serializer.validated_data)
