from rest_framework import serializers

from api.services.lookup_definitions import LOOKUP_DEFINITIONS


class LookupTablesSerializer(serializers.Serializer):
    def get_fields(self):
        fields = {}

        for name, definition in LOOKUP_DEFINITIONS.items():
            fields[name] = definition.serializer(many=True)

        return fields


class LookupCreateSerializer(serializers.Serializer):
    values = serializers.DictField(
        child=serializers.JSONField(),
    )


class LookupUpdateSerializer(serializers.Serializer):
    lookup = serializers.DictField(
        child=serializers.JSONField(),
        allow_empty=False,
    )
    values = serializers.DictField(
        child=serializers.JSONField(),
        allow_empty=False,
    )
