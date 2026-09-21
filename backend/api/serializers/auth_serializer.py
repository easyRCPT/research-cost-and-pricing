from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

ACCOUNT_TYPES = ["researcher", "staff"]


class AccountTypeField(serializers.ChoiceField):
    """
    Which tab someone came in through.

    Only the two self-service doors: nothing signs itself up as superadmin,
    and there is no hod or dean door because neither is a group (#40).
    """

    def __init__(self, **kwargs):
        super().__init__(choices=ACCOUNT_TYPES, **kwargs)


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    account_type = AccountTypeField()

    def validate_password(self, value: str) -> str:
        # Django's own validators, so the rules live in settings rather than
        # being reinvented here and in the browser.
        try:
            validate_password(value)
        except DjangoValidationError as invalid:
            raise serializers.ValidationError(list(invalid.messages)) from invalid
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    account_type = AccountTypeField()


class AdminLoginSerializer(serializers.Serializer):
    # No account_type: the admin door is its own page, not a tab.
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField(allow_blank=True)
    last_name = serializers.CharField(allow_blank=True)


class AssignmentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    role = serializers.CharField()
    department = serializers.CharField(allow_null=True)
    faculty = serializers.CharField(allow_null=True)


class MeSerializer(serializers.Serializer):
    """
    Everything a guard needs in one answer.

    `assignments` sits beside `groups` because the client cannot tell from
    groups alone whether someone approves anything: the scope is the rule.
    """

    user = UserSerializer()
    groups = serializers.ListField(child=serializers.CharField())
    assignments = AssignmentSerializer(many=True)
