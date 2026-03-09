from rest_framework import serializers

from .models import Disease, Service, Structure
from backend.resources_app.models import Resource


class ResourceSummarySerializer(serializers.ModelSerializer):
    availability = serializers.SerializerMethodField()

    def get_availability(self, obj: Resource) -> bool:
        return obj.availability

    class Meta:
        model = Resource
        fields = [
            "id",
            "resource_type",
            "name_or_group",
            "quantity",
            "unit",
            "status",
            "blood_group",
            "availability",
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
    service_ids = serializers.PrimaryKeyRelatedField(
        source="services",
        queryset=Service.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = Structure
        fields = [
            "id",
            "name",
            "type",
            "address",
            "contact_phone",
            "is_active",
            "created_at",
            "location",
            "services",
            "service_ids",
        ]


class StructureSearchResultSerializer(serializers.ModelSerializer):
    distance = serializers.SerializerMethodField()
    distance_m = serializers.SerializerMethodField()
    resources = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    blood_groups = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

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
        resources = self._search_resources(obj)[:4]
        return ResourceSummarySerializer(resources, many=True).data

    def get_services(self, obj):
        if not self.context.get("include_services", False):
            return []
        return ServiceSerializer(obj.services.all(), many=True).data

    def _search_resources(self, obj) -> list[Resource]:
        filtered = self.context.get("resource_filter")
        queryset = obj.resources.all()
        if filtered:
            queryset = queryset.filter(resource_type=filtered)
        blood_group = self.context.get("blood_group_filter")
        if blood_group:
            queryset = queryset.filter(blood_group__iexact=blood_group)
        only_available = self.context.get("availability_filter")
        if only_available:
            queryset = queryset.exclude(status=Resource.OUT_OF_STOCK).filter(quantity__gt=0)
        return list(queryset.order_by("resource_type", "name_or_group"))

    def get_blood_groups(self, obj) -> list[str]:
        groups = {
            resource.blood_group
            for resource in self._search_resources(obj)
            if resource.blood_group
        }
        return sorted(groups)

    def get_availability(self, obj) -> bool:
        return any(resource.availability for resource in self._search_resources(obj))

    def get_latitude(self, obj) -> float:
        return float(obj.location.y)

    def get_longitude(self, obj) -> float:
        return float(obj.location.x)

    class Meta:
        model = Structure
        fields = [
            "id",
            "name",
            "type",
            "address",
            "contact_phone",
            "is_active",
            "created_at",
            "location",
            "distance",
            "distance_m",
            "availability",
            "blood_groups",
            "latitude",
            "longitude",
            "resources",
            "services",
        ]


