from rest_framework import serializers

from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
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
            "last_updated",
        ]


