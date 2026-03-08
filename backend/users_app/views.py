from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from backend.audit_app.services import create_audit_log
from backend.common.permissions import IsSuperAdmin

from .models import User
from .serializers import UserSelfSerializer, UserSerializer


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


