from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class MediCentralTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["email"] = serializers.EmailField(write_only=True, required=False)
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
        if not attrs.get(self.username_field):
            raise AuthenticationFailed(
                self.error_messages["no_active_account"],
                "no_active_account",
            )
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        role = getattr(user, "role", None)
        if role == "PUBLIC" and getattr(user, "is_superuser", False):
            role = "SUPER_ADMIN"
        token["role"] = role
        token["structure_id"] = getattr(user, "structure_id", None)
        return token


class MediCentralTokenObtainPairView(TokenObtainPairView):
    serializer_class = MediCentralTokenObtainPairSerializer
