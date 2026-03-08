from django.apps import AppConfig


class AuditAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "backend.audit_app"
    label = "audit_app"
    verbose_name = "Audit"


