from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    structure_name = serializers.CharField(source="structure.name", read_only=True)
    resource_display = serializers.CharField(source="resource.__str__", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "timestamp",
            "action",
            "user",
            "user_email",
            "structure",
            "structure_name",
            "resource",
            "resource_display",
            "metadata",
        ]


