from rest_framework import viewsets
from backend.audit_app.services import create_audit_log
from backend.common.permissions import IsSuperAdmin

from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet de gestion des utilisateurs.

    Réservé aux administrateurs de la plateforme.
    """

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsSuperAdmin]

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


