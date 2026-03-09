from rest_framework import serializers

from backend.structures_app.models import Structure

from .models import User


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        trim_whitespace=False,
    )
    structure_name = serializers.CharField(source="structure.name", read_only=True)
    structure_type = serializers.ChoiceField(
        choices=["Hopital", "Clinique", "Pharmacie", "Banque"],
        write_only=True,
        required=False,
        allow_blank=True,
    )

    def validate(self, attrs):
        role = attrs.get("role", getattr(self.instance, "role", None))
        if role == User.Roles.STRUCTURE_ADMIN:
            role = User.Roles.ADMIN_STRUCTURE
            attrs["role"] = User.Roles.ADMIN_STRUCTURE
        structure = attrs.get("structure", getattr(self.instance, "structure", None))
        structure_type = attrs.pop("structure_type", "").strip()
        email = attrs.get("email", getattr(self.instance, "email", "")).strip().lower()

        if role in {User.Roles.SUPER_ADMIN, User.Roles.ADMIN_STRUCTURE} and not email:
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

        if role == User.Roles.ADMIN_STRUCTURE and structure is None:
            raise serializers.ValidationError(
                {"structure": "Une structure est requise pour un compte ADMIN_STRUCTURE."}
            )
        if role != User.Roles.ADMIN_STRUCTURE:
            attrs["structure"] = None

        if role == User.Roles.ADMIN_STRUCTURE and structure_type:
            if structure is None or structure.type != structure_type:
                raise serializers.ValidationError(
                    {
                        "structure_type": (
                            "Le type de structure sélectionné ne correspond pas "
                            "à la structure rattachée."
                        )
                    }
                )
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
            "profile_picture",
            "structure_type",
        ]


class UserSelfSerializer(serializers.ModelSerializer):
    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        if not email:
            raise serializers.ValidationError("Un email valide est requis.")
        qs = User.objects.filter(email__iexact=email).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return email

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "profile_picture",
        ]


class CreateStructureAdminSerializer(serializers.Serializer):
    admin_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, trim_whitespace=False)
    is_active = serializers.BooleanField(default=True)

    structure_name = serializers.CharField(max_length=255)
    structure_type = serializers.ChoiceField(
        choices=[choice for choice, _ in Structure.TYPE_CHOICES]
    )
    city = serializers.CharField(max_length=255)
    address = serializers.CharField(max_length=512)
    phone = serializers.CharField(max_length=50, allow_blank=True, required=False)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    def validate(self, attrs):
        latitude = attrs["latitude"]
        longitude = attrs["longitude"]
        if not (-90 <= latitude <= 90):
            raise serializers.ValidationError({"latitude": "Latitude invalide."})
        if not (-180 <= longitude <= 180):
            raise serializers.ValidationError({"longitude": "Longitude invalide."})
        return attrs


