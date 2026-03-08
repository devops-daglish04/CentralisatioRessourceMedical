from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.contrib.gis.measure import D
from django.core.cache import cache
from django.db.models import Prefetch, Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response

from backend.audit_app.services import create_audit_log
from backend.common.permissions import IsSuperAdmin, ReadOnlyOrSuperAdmin
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

    def get_permissions(self):
        if self.action in {"create", "destroy"}:
            return [IsSuperAdmin()]
        if self.action in {"update", "partial_update"}:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

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
        user = self.request.user
        instance = serializer.instance
        user_role = getattr(user, "role", None)
        is_structure_admin = user_role in {"STRUCTURE_ADMIN", "ADMIN_STRUCTURE"}
        is_super_admin = user_role == "SUPER_ADMIN"
        if not is_super_admin:
            if not is_structure_admin or user.structure_id != instance.id:
                raise PermissionDenied(
                    "Vous ne pouvez modifier que votre propre structure."
                )

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

    @action(
        detail=False,
        methods=["get", "patch"],
        permission_classes=[permissions.IsAuthenticated],
        url_path="me",
    )
    def me(self, request: Request) -> Response:
        user = request.user
        if getattr(user, "role", None) not in {"STRUCTURE_ADMIN", "ADMIN_STRUCTURE"} or user.structure_id is None:
            raise PermissionDenied("Cette action est réservée aux administrateurs de structure.")

        try:
            instance = Structure.objects.get(pk=user.structure_id)
        except Structure.DoesNotExist:
            return Response(
                {"detail": "Structure associée introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "GET":
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


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


def _normalize_resource_type(raw_value: str | None) -> str | None:
    if not raw_value:
        return None
    normalized = raw_value.strip().lower()
    mapping = {
        "sang": Resource.BLOOD,
        "blood": Resource.BLOOD,
        "medicament": Resource.MEDICINE,
        "médicament": Resource.MEDICINE,
        "medicine": Resource.MEDICINE,
        "medicaments": Resource.MEDICINE,
        "médicaments": Resource.MEDICINE,
        "oxygene": Resource.OXYGEN,
        "oxygène": Resource.OXYGEN,
        "oxygen": Resource.OXYGEN,
        "couveuse": Resource.INCUBATOR,
        "couveuses": Resource.INCUBATOR,
        "incubator": Resource.INCUBATOR,
        "incubators": Resource.INCUBATOR,
    }
    return mapping.get(normalized)


def _city_to_coordinates(city: str | None) -> tuple[float, float] | None:
    if not city:
        return None
    normalized = city.strip().lower()
    city_map: dict[str, tuple[float, float]] = {
        "yaounde": (3.8667, 11.5167),
        "yaoundé": (3.8667, 11.5167),
        "douala": (4.0511, 9.7679),
        "bafoussam": (5.4781, 10.4179),
        "garoua": (9.3265, 13.3938),
    }
    return city_map.get(normalized)


@api_view(["GET"])
def search_structures(request: Request) -> Response:
    """
    Endpoint de recherche géographique.

    /api/search/?lat=...&lng=...
    Renvoie les structures triées par distance avec ressources et services.
    """

    query = request.query_params.get("query", "").strip()
    city = request.query_params.get("city", "").strip()
    lat = request.query_params.get("lat") or request.query_params.get("latitude")
    lng = request.query_params.get("lng") or request.query_params.get("longitude")
    radius_km = _parse_float(
        request.query_params.get("radius") or request.query_params.get("radius_km"),
        default=25.0,
    )
    limit = _parse_int(request.query_params.get("limit"), default=80)
    structure_type = (
        request.query_params.get("type")
        or request.query_params.get("structure_type")
        or ""
    ).strip()
    resource_filter = _normalize_resource_type(request.query_params.get("resource"))
    blood_group_filter = (request.query_params.get("blood_group") or "").strip().upper()
    only_available = _parse_bool(request.query_params.get("availability"), default=False)
    include_resources = _parse_bool(
        request.query_params.get("include_resources"), default=True
    )
    include_services = _parse_bool(
        request.query_params.get("include_services"), default=False
    )

    if lat is None or lng is None:
        city_coordinates = _city_to_coordinates(city)
        if city_coordinates is None:
            return Response(
                {
                    "detail": (
                        "Les paramètres de position sont requis: "
                        "'lat'/'lng' ou 'latitude'/'longitude', ou une ville supportée."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        lat_f, lng_f = city_coordinates
    else:
        try:
            lat_f = float(lat)
            lng_f = float(lng)
        except ValueError:
            return Response(
                {
                    "detail": (
                        "Les paramètres 'lat'/'lng' (ou 'latitude'/'longitude') "
                        "doivent être des nombres."
                    )
                },
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
        f"search:v4:{query}:{city}:{structure_type}:{resource_filter}:{blood_group_filter}:{int(only_available)}:"
        f"{round(lat_f, 3)}:{round(lng_f, 3)}:{round(radius_km, 1)}:{limit}:"
        f"{int(include_resources)}:{int(include_services)}"
    )
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    user_location = Point(lng_f, lat_f, srid=4326)

    qs = Structure.objects.filter(is_active=True).filter(
        location__distance_lte=(user_location, D(km=radius_km))
    )
    if query:
        qs = qs.filter(
            Q(name__icontains=query)
            | Q(address__icontains=query)
            | Q(type__icontains=query)
            | Q(services__name__icontains=query)
            | Q(resources__name_or_group__icontains=query)
        )
    if structure_type:
        qs = qs.filter(type__iexact=structure_type)
    if resource_filter:
        qs = qs.filter(resources__resource_type=resource_filter)
    if blood_group_filter:
        qs = qs.filter(resources__blood_group__iexact=blood_group_filter)
    if only_available:
        qs = qs.filter(resources__status__in=[Resource.AVAILABLE, Resource.CRITICAL]).filter(
            resources__quantity__gt=0
        )

    qs = qs.annotate(distance=Distance("location", user_location)).order_by("distance").distinct()

    prefetches = []
    if include_resources:
        resource_queryset = Resource.objects.only(
            "id",
            "structure_id",
            "resource_type",
            "name_or_group",
            "quantity",
            "unit",
            "status",
            "blood_group",
            "last_updated",
        ).order_by("resource_type", "name_or_group")
        if resource_filter:
            resource_queryset = resource_queryset.filter(resource_type=resource_filter)
        if blood_group_filter:
            resource_queryset = resource_queryset.filter(
                blood_group__iexact=blood_group_filter
            )
        if only_available:
            resource_queryset = resource_queryset.exclude(status=Resource.OUT_OF_STOCK).filter(
                quantity__gt=0
            )

        prefetches.append(
            Prefetch(
                "resources",
                queryset=resource_queryset,
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
            "resource_filter": resource_filter,
            "blood_group_filter": blood_group_filter,
            "availability_filter": only_available,
        },
    )
    data = serializer.data
    cache.set(cache_key, data, timeout=20)
    return Response(data)


