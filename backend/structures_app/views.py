from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.core.cache import cache
from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from backend.audit_app.services import create_audit_log
from backend.common.permissions import ReadOnlyOrSuperAdmin
from backend.resources_app.models import Resource

from .models import Disease, Service, Structure
from .serializers import (
    DiseaseSerializer,
    ServiceSerializer,
    StructureSearchResultSerializer,
    StructureSerializer,
)


class StructureViewSet(viewsets.ModelViewSet):
    queryset = Structure.objects.all().order_by("name")
    serializer_class = StructureSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]

    def perform_create(self, serializer):
        structure = serializer.save()
        create_audit_log(
            request=self.request,
            action="STRUCTURE_CREATED",
            structure=structure,
            metadata={
                "name": structure.name,
                "type": structure.type,
                "address": structure.address,
                "contact_phone": structure.contact_phone,
                "is_active": structure.is_active,
            },
        )

    def perform_update(self, serializer):
        previous = serializer.instance
        before = {
            "name": previous.name,
            "type": previous.type,
            "address": previous.address,
            "contact_phone": previous.contact_phone,
            "is_active": previous.is_active,
        }
        structure = serializer.save()
        after = {
            "name": structure.name,
            "type": structure.type,
            "address": structure.address,
            "contact_phone": structure.contact_phone,
            "is_active": structure.is_active,
        }
        create_audit_log(
            request=self.request,
            action="STRUCTURE_UPDATED",
            structure=structure,
            metadata={"before": before, "after": after},
        )

    def perform_destroy(self, instance):
        snapshot = {
            "id": instance.id,
            "name": instance.name,
            "type": instance.type,
            "address": instance.address,
            "contact_phone": instance.contact_phone,
            "is_active": instance.is_active,
        }
        create_audit_log(
            request=self.request,
            action="STRUCTURE_DELETED",
            structure=None,
            metadata={"deleted": snapshot},
        )
        instance.delete()


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all().order_by("name")
    serializer_class = ServiceSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]


class DiseaseViewSet(viewsets.ModelViewSet):
    queryset = Disease.objects.all().order_by("name")
    serializer_class = DiseaseSerializer
    permission_classes = [ReadOnlyOrSuperAdmin]


def _parse_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _parse_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@api_view(["GET"])
def search_structures(request: Request) -> Response:
    """
    Endpoint de recherche géographique.

    /api/search/?lat=...&lng=...
    Renvoie les structures triées par distance avec ressources et services.
    """

    lat = request.query_params.get("lat")
    lng = request.query_params.get("lng")
    radius_km = _parse_float(request.query_params.get("radius_km"), default=25.0)
    limit = _parse_int(request.query_params.get("limit"), default=80)
    include_resources = _parse_bool(
        request.query_params.get("include_resources"), default=True
    )
    include_services = _parse_bool(
        request.query_params.get("include_services"), default=False
    )

    if lat is None or lng is None:
        return Response(
            {"detail": "Les paramètres 'lat' et 'lng' sont requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except ValueError:
        return Response(
            {"detail": "Les paramètres 'lat' et 'lng' doivent être des nombres."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (-90 <= lat_f <= 90 and -180 <= lng_f <= 180):
        return Response(
            {"detail": "Latitude ou longitude hors limites valides."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    radius_km = max(1.0, min(radius_km, 200.0))
    limit = max(1, min(limit, 300))

    cache_key = (
        f"search:v3:{round(lat_f, 3)}:{round(lng_f, 3)}:"
        f"{round(radius_km, 1)}:{limit}:{int(include_resources)}:{int(include_services)}"
    )
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    user_location = Point(lng_f, lat_f, srid=4326)

    qs = (
        Structure.objects.filter(is_active=True)
        .filter(location__distance_lte=(user_location, D(km=radius_km)))
        .annotate(distance=Distance("location", user_location))
        .order_by("distance")
    )

    prefetches = []
    if include_resources:
        prefetches.append(
            Prefetch(
                "resources",
                queryset=Resource.objects.only(
                    "id",
                    "structure_id",
                    "resource_type",
                    "name_or_group",
                    "quantity",
                    "unit",
                    "status",
                    "last_updated",
                ).order_by("resource_type", "name_or_group"),
            )
        )
    if include_services:
        prefetches.append(
            Prefetch(
                "services",
                queryset=Service.objects.only("id", "name").prefetch_related(
                    Prefetch("diseases", queryset=Disease.objects.only("id", "name"))
                ),
            )
        )
    if prefetches:
        qs = qs.prefetch_related(*prefetches)

    qs = qs[:limit]
    serializer = StructureSearchResultSerializer(
        qs,
        many=True,
        context={
            "include_resources": include_resources,
            "include_services": include_services,
        },
    )
    data = serializer.data
    cache.set(cache_key, data, timeout=20)
    return Response(data)


