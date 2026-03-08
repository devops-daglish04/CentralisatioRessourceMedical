from __future__ import annotations

from typing import Any

from rest_framework.request import Request

from .models import AuditLog


def _user_from_request(request: Request):
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        return user
    return None


def create_audit_log(
    *,
    request: Request,
    action: str,
    structure=None,
    resource=None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        user=_user_from_request(request),
        action=action,
        structure=structure,
        resource=resource,
        metadata=metadata or {},
    )
