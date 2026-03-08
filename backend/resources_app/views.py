from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from backend.audit_app.services import create_audit_log
from backend.common.permissions import ReadOnlyOrStructureOrSuperAdmin

from .models import Resource
from .serializers import ResourceSerializer


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [ReadOnlyOrStructureOrSuperAdmin]

    def get_queryset(self):
        qs = Resource.objects.select_related("structure").all().order_by(
            "structure__name", "resource_type", "name_or_group"
        )
        user = self.request.user
        if (
            user.is_authenticated
            and getattr(user, "role", None) == "STRUCTURE_ADMIN"
        ):
            if user.structure_id is None:
                return qs.none()
            return qs.filter(structure_id=user.structure_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if (
            user.is_authenticated
            and getattr(user, "role", None) == "STRUCTURE_ADMIN"
        ):
            if user.structure_id is None:
                raise ValidationError(
                    {"detail": "Ce compte admin n'est rattaché à aucune structure."}
                )
            resource = serializer.save(structure_id=user.structure_id)
            create_audit_log(
                request=self.request,
                action="RESOURCE_CREATED",
                structure=resource.structure,
                resource=resource,
                metadata={
                    "resource_type": resource.resource_type,
                    "name_or_group": resource.name_or_group,
                    "quantity": resource.quantity,
                    "unit": resource.unit,
                    "status": resource.status,
                },
            )
            return
        resource = serializer.save()
        create_audit_log(
            request=self.request,
            action="RESOURCE_CREATED",
            structure=resource.structure,
            resource=resource,
            metadata={
                "resource_type": resource.resource_type,
                "name_or_group": resource.name_or_group,
                "quantity": resource.quantity,
                "unit": resource.unit,
                "status": resource.status,
            },
        )

    def perform_update(self, serializer):
        previous = serializer.instance
        before = {
            "structure_id": previous.structure_id,
            "resource_type": previous.resource_type,
            "name_or_group": previous.name_or_group,
            "quantity": previous.quantity,
            "unit": previous.unit,
            "status": previous.status,
        }
        user = self.request.user
        if (
            user.is_authenticated
            and getattr(user, "role", None) == "STRUCTURE_ADMIN"
        ):
            if user.structure_id is None:
                raise ValidationError(
                    {"detail": "Ce compte admin n'est rattaché à aucune structure."}
                )
            resource = serializer.save(structure_id=user.structure_id)
            after = {
                "structure_id": resource.structure_id,
                "resource_type": resource.resource_type,
                "name_or_group": resource.name_or_group,
                "quantity": resource.quantity,
                "unit": resource.unit,
                "status": resource.status,
            }
            create_audit_log(
                request=self.request,
                action="RESOURCE_UPDATED",
                structure=resource.structure,
                resource=resource,
                metadata={"before": before, "after": after},
            )
            return
        resource = serializer.save()
        after = {
            "structure_id": resource.structure_id,
            "resource_type": resource.resource_type,
            "name_or_group": resource.name_or_group,
            "quantity": resource.quantity,
            "unit": resource.unit,
            "status": resource.status,
        }
        create_audit_log(
            request=self.request,
            action="RESOURCE_UPDATED",
            structure=resource.structure,
            resource=resource,
            metadata={"before": before, "after": after},
        )

    def perform_destroy(self, instance):
        snapshot = {
            "id": instance.id,
            "structure_id": instance.structure_id,
            "resource_type": instance.resource_type,
            "name_or_group": instance.name_or_group,
            "quantity": instance.quantity,
            "unit": instance.unit,
            "status": instance.status,
        }
        create_audit_log(
            request=self.request,
            action="RESOURCE_DELETED",
            structure=instance.structure,
            resource=None,
            metadata={"deleted": snapshot},
        )
        instance.delete()


