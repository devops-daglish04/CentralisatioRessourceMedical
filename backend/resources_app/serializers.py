from rest_framework import serializers

from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
    availability = serializers.SerializerMethodField(read_only=True)

    def get_availability(self, obj: Resource) -> bool:
        return obj.availability

    def validate(self, attrs):
        resource_type = attrs.get("resource_type", getattr(self.instance, "resource_type", ""))
        blood_group = attrs.get("blood_group", getattr(self.instance, "blood_group", ""))

        if resource_type == Resource.BLOOD and not blood_group:
            name_or_group = attrs.get("name_or_group", "").strip()
            if name_or_group in {choice for choice, _ in Resource.BLOOD_GROUP_CHOICES}:
                attrs["blood_group"] = name_or_group

        if resource_type != Resource.BLOOD:
            attrs["blood_group"] = ""
        return attrs

    class Meta:
        model = Resource
        fields = [
            "id",
            "structure",
            "resource_type",
            "name_or_group",
            "quantity",
            "unit",
            "status",
            "blood_group",
            "availability",
            "last_updated",
        ]


