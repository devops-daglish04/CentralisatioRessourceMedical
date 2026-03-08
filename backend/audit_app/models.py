from django.conf import settings
from django.db import models

from backend.resources_app.models import Resource
from backend.structures_app.models import Structure


class AuditLog(models.Model):
    ACTION_MAX_LENGTH = 255

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=ACTION_MAX_LENGTH)
    timestamp = models.DateTimeField(auto_now_add=True)
    structure = models.ForeignKey(
        Structure,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    resource = models.ForeignKey(
        Resource,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    metadata = models.JSONField(blank=True, null=True)

    class Meta:
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"
        ordering = ("-timestamp",)

    def __str__(self) -> str:
        return f"{self.timestamp} - {self.action}"


