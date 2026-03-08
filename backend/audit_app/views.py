from rest_framework import viewsets
from backend.common.permissions import IsSuperAdmin

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Journal d'audit en lecture seule.
    """

    queryset = AuditLog.objects.select_related("user", "structure", "resource").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
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


