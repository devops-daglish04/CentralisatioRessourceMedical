from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils.text import slugify
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from backend.audit_app.services import create_audit_log
from backend.common.permissions import IsSuperAdmin
from backend.structures_app.models import Structure
from backend.structures_app.serializers import StructureSerializer

from .models import User
from .serializers import (
    CreateStructureAdminSerializer,
    UserSelfSerializer,
    UserSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet de gestion des utilisateurs.

    Réservé aux administrateurs de la plateforme.
    """

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        return [permission() for permission in self.permission_classes]

    def get_serializer_class(self):
        if self.action == "me":
            return UserSelfSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get("role", "").strip()
        if role:
            if role in {"ADMIN_STRUCTURE", "STRUCTURE_ADMIN"}:
                qs = qs.filter(role__in=["ADMIN_STRUCTURE", "STRUCTURE_ADMIN"])
            else:
                qs = qs.filter(role=role)
        return qs

    def perform_create(self, serializer):
        user = serializer.save()
        create_audit_log(
            request=self.request,
            action="ADMIN_ACCOUNT_CREATED",
            structure=user.structure,
            metadata={
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "structure_id": user.structure_id,
                "is_active": user.is_active,
            },
        )

    def perform_update(self, serializer):
        previous = serializer.instance
        before = {
            "username": previous.username,
            "email": previous.email,
            "role": previous.role,
            "structure_id": previous.structure_id,
            "is_active": previous.is_active,
        }
        user = serializer.save()
        after = {
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "structure_id": user.structure_id,
            "is_active": user.is_active,
        }
        create_audit_log(
            request=self.request,
            action="ADMIN_ACCOUNT_UPDATED",
            structure=user.structure,
            metadata={"before": before, "after": after},
        )

    def perform_destroy(self, instance):
        snapshot = {
            "user_id": instance.id,
            "username": instance.username,
            "email": instance.email,
            "role": instance.role,
            "structure_id": instance.structure_id,
            "is_active": instance.is_active,
        }
        create_audit_log(
            request=self.request,
            action="ADMIN_ACCOUNT_DELETED",
            structure=instance.structure,
            metadata={"deleted": snapshot},
        )
        instance.delete()

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        serializer = self.get_serializer(
            request.user,
            data=request.data if request.method == "PATCH" else None,
            partial=True,
        )
        if request.method == "GET":
            return Response(serializer.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsSuperAdmin],
        url_path="create-structure-admin",
    )
    def create_structure_admin(self, request):
        payload_serializer = CreateStructureAdminSerializer(data=request.data)
        payload_serializer.is_valid(raise_exception=True)
        payload = payload_serializer.validated_data

        username = self._unique_username(payload["admin_name"], payload["email"])
        address = payload["address"].strip()
        city = payload["city"].strip()
        if city and city.lower() not in address.lower():
            address = f"{address}, {city}"

        with transaction.atomic():
            structure = Structure.objects.create(
                name=payload["structure_name"].strip(),
                type=payload["structure_type"],
                address=address,
                contact_phone=payload.get("phone", "").strip(),
                is_active=payload["is_active"],
                location=Point(payload["longitude"], payload["latitude"], srid=4326),
            )
            create_audit_log(
                request=request,
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

            user_serializer = UserSerializer(
                data={
                    "username": username,
                    "first_name": payload["admin_name"].strip(),
                    "email": payload["email"].strip().lower(),
                    "role": User.Roles.ADMIN_STRUCTURE,
                    "structure": structure.id,
                    "structure_type": payload["structure_type"],
                    "password": payload["password"],
                    "is_active": payload["is_active"],
                }
            )
            user_serializer.is_valid(raise_exception=True)
            user = user_serializer.save()

            create_audit_log(
                request=request,
                action="ADMIN_ACCOUNT_CREATED",
                structure=structure,
                metadata={
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": user.role,
                    "structure_id": structure.id,
                    "is_active": user.is_active,
                },
            )

        return Response(
            {
                "user": UserSerializer(user).data,
                "structure": StructureSerializer(structure).data,
            },
            status=201,
        )

    def _unique_username(self, admin_name: str, email: str) -> str:
        base = slugify(admin_name)[:130]
        if not base:
            base = slugify(email.split("@", 1)[0])[:130]
        if not base:
            base = "admin"

        candidate = base
        suffix = 1
        while User.objects.filter(username=candidate).exists():
            suffix += 1
            candidate = f"{base}-{suffix}"
            if len(candidate) > 150:
                candidate = candidate[:150]
        return candidate


