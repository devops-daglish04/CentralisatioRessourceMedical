from rest_framework import serializers

from .models import Disease, Service, Structure
from backend.resources_app.models import Resource


class ResourceSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            "id",
            "resource_type",
            "name_or_group",
            "quantity",
            "unit",
            "status",
            "last_updated",
        ]


class DiseaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Disease
        fields = ["id", "name"]


class ServiceSerializer(serializers.ModelSerializer):
    diseases = DiseaseSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = ["id", "name", "diseases"]


class StructureSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = Structure
        fields = [
            "id",
            "name",
            "type",
            "address",
            "contact_phone",
            "is_active",
            "location",
            "services",
        ]


class StructureSearchResultSerializer(serializers.ModelSerializer):
    distance = serializers.SerializerMethodField()
    distance_m = serializers.SerializerMethodField()
    resources = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()

    def _distance_meters(self, obj) -> float:
        distance = getattr(obj, "distance", None)
        if distance is None:
            return 0.0
        if hasattr(distance, "m"):
            return float(distance.m)
        return float(distance)

    def get_distance(self, obj) -> float:
        # `distance` is returned in kilometers for frontend display consistency.
        return self._distance_meters(obj) / 1000.0

    def get_distance_m(self, obj) -> float:
        return self._distance_meters(obj)

    def get_resources(self, obj):
        if not self.context.get("include_resources", True):
            return []
        resources = list(obj.resources.all())[:4]
        return ResourceSummarySerializer(resources, many=True).data

    def get_services(self, obj):
        if not self.context.get("include_services", False):
            return []
        return ServiceSerializer(obj.services.all(), many=True).data

    class Meta:
        model = Structure
        fields = [
            "id",
            "name",
            "type",
            "address",
            "contact_phone",
            "is_active",
            "location",
            "distance",
            "distance_m",
            "resources",
            "services",
        ]


