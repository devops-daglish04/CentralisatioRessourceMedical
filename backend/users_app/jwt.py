from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class MediCentralTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Keep "email" as input key for the frontend, but accept either email or username.
        self.fields["email"] = serializers.CharField(
            write_only=True, required=False, allow_blank=True
        )
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        email = attrs.pop("email", "").strip()
        username = attrs.get(self.username_field, "").strip()
        if not username and email:
            user_model = get_user_model()
            matched_user = (
                user_model.objects.filter(email__iexact=email)
                .only(self.username_field)
                .first()
            )
            if matched_user is not None:
                attrs[self.username_field] = getattr(matched_user, self.username_field)
            else:
                # Backward compatibility: allow username typed in the "email" field.
                attrs[self.username_field] = email
        if not attrs.get(self.username_field):
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )
        data = super().validate(attrs)
        role = getattr(self.user, "role", None)
        if role == "STRUCTURE_ADMIN":
            role = "ADMIN_STRUCTURE"
        if role == "PUBLIC" and getattr(self.user, "is_superuser", False):
            role = "SUPER_ADMIN"
        data["role"] = role
        data["structure_id"] = getattr(self.user, "structure_id", None)
        data["user_id"] = getattr(self.user, "id", None)
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role = getattr(user, "role", None)
        if role == "STRUCTURE_ADMIN":
            role = "ADMIN_STRUCTURE"
        if role == "PUBLIC" and getattr(user, "is_superuser", False):
            role = "SUPER_ADMIN"
        token["role"] = role
        token["structure_id"] = getattr(user, "structure_id", None)
        return token


class MediCentralTokenObtainPairView(TokenObtainPairView):
    serializer_class = MediCentralTokenObtainPairSerializer
