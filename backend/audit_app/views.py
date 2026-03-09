from rest_framework import permissions, viewsets

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Journal d'audit en lecture seule.
    """

    queryset = AuditLog.objects.select_related("user", "structure", "resource").all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", None)
        is_super_admin = bool(
            user
            and user.is_authenticated
            and (role == "SUPER_ADMIN" or getattr(user, "is_superuser", False))
        )
        is_structure_admin = role in {"STRUCTURE_ADMIN", "ADMIN_STRUCTURE"}

        qs = super().get_queryset()
        if is_super_admin:
            pass
        elif is_structure_admin and getattr(user, "structure_id", None):
            qs = qs.filter(structure_id=user.structure_id)
        else:
            return qs.none()

        params = self.request.query_params

        action = params.get("action")
        if action:
            qs = qs.filter(action=action)

        user_id = params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        structure_id = params.get("structure_id")
        if structure_id:
            qs = qs.filter(structure_id=structure_id)

        resource_id = params.get("resource_id")
        if resource_id:
            qs = qs.filter(resource_id=resource_id)

        return qs


