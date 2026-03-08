from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsSuperAdmin(BasePermission):
    """Allow access only to authenticated users with SUPER_ADMIN role."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "role", None) == "SUPER_ADMIN"
                or getattr(user, "is_superuser", False)
            )
        )


class ReadOnlyOrSuperAdmin(BasePermission):
    """Allow read-only for everyone, write operations for SUPER_ADMIN only."""

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (
                getattr(user, "role", None) == "SUPER_ADMIN"
                or getattr(user, "is_superuser", False)
            )
        )


class ReadOnlyOrStructureOrSuperAdmin(BasePermission):
    """Allow read-only for everyone, write operations for structure/super admins."""

    allowed_write_roles = {"STRUCTURE_ADMIN", "ADMIN_STRUCTURE", "SUPER_ADMIN"}

    def has_permission(self, request, view) -> bool:
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and getattr(user, "role", None) in self.allowed_write_roles
        )
