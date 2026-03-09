from types import SimpleNamespace

from django.test import SimpleTestCase

from backend.common.permissions import (
    IsSuperAdmin,
    ReadOnlyOrStructureOrSuperAdmin,
    ReadOnlyOrSuperAdmin,
)


class _DummyRequest(SimpleNamespace):
    method: str
    user: SimpleNamespace


def _request(method: str, *, role: str | None, is_authenticated: bool, is_superuser: bool = False):
    user = SimpleNamespace(
        role=role,
        is_authenticated=is_authenticated,
        is_superuser=is_superuser,
    )
    return _DummyRequest(method=method, user=user)


class PermissionTests(SimpleTestCase):
    def test_is_super_admin_allows_super_admin_or_superuser(self):
        permission = IsSuperAdmin()

        allowed_role = permission.has_permission(
            _request("GET", role="SUPER_ADMIN", is_authenticated=True),
            None,
        )
        allowed_superuser = permission.has_permission(
            _request("GET", role="PUBLIC", is_authenticated=True, is_superuser=True),
            None,
        )
        denied_public = permission.has_permission(
            _request("GET", role="PUBLIC", is_authenticated=True),
            None,
        )

        self.assertTrue(allowed_role)
        self.assertTrue(allowed_superuser)
        self.assertFalse(denied_public)

    def test_read_only_or_super_admin(self):
        permission = ReadOnlyOrSuperAdmin()

        read_allowed = permission.has_permission(
            _request("GET", role=None, is_authenticated=False),
            None,
        )
        write_denied_public = permission.has_permission(
            _request("PATCH", role="PUBLIC", is_authenticated=True),
            None,
        )
        write_allowed_super = permission.has_permission(
            _request("PATCH", role="SUPER_ADMIN", is_authenticated=True),
            None,
        )

        self.assertTrue(read_allowed)
        self.assertFalse(write_denied_public)
        self.assertTrue(write_allowed_super)

    def test_read_only_or_structure_or_super_admin(self):
        permission = ReadOnlyOrStructureOrSuperAdmin()

        write_allowed_admin_structure = permission.has_permission(
            _request("POST", role="ADMIN_STRUCTURE", is_authenticated=True),
            None,
        )
        write_allowed_structure_alias = permission.has_permission(
            _request("POST", role="STRUCTURE_ADMIN", is_authenticated=True),
            None,
        )
        write_allowed_super = permission.has_permission(
            _request("POST", role="SUPER_ADMIN", is_authenticated=True),
            None,
        )
        write_denied_public = permission.has_permission(
            _request("POST", role="PUBLIC", is_authenticated=True),
            None,
        )

        self.assertTrue(write_allowed_admin_structure)
        self.assertTrue(write_allowed_structure_alias)
        self.assertTrue(write_allowed_super)
        self.assertFalse(write_denied_public)
