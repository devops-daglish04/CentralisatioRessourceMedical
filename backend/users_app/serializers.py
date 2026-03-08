from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        trim_whitespace=False,
    )
    structure_name = serializers.CharField(source="structure.name", read_only=True)

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        structure = attrs.get("structure", getattr(self.instance, "structure", None))
        email = attrs.get("email", getattr(self.instance, "email", "")).strip().lower()

        if role in {User.Roles.SUPER_ADMIN, User.Roles.STRUCTURE_ADMIN} and not email:
            raise serializers.ValidationError(
                {"email": "Un email est requis pour les comptes administrateurs."}
            )

        if email:
            email_qs = User.objects.filter(email__iexact=email)
            if self.instance is not None:
                email_qs = email_qs.exclude(pk=self.instance.pk)
            if email_qs.exists():
                raise serializers.ValidationError(
                    {"email": "Cet email est déjà utilisé par un autre compte."}
                )
            attrs["email"] = email

        if role == "STRUCTURE_ADMIN" and structure is None:
            raise serializers.ValidationError(
                {"structure": "Une structure est requise pour un compte STRUCTURE_ADMIN."}
            )
        if role != "STRUCTURE_ADMIN":
            attrs["structure"] = None
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError(
                {"password": "Le mot de passe est requis à la création du compte."}
            )
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "structure",
            "structure_name",
            "password",
            "is_active",
        ]


