"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from backend.users_app.jwt import MediCentralTokenObtainPairView
from backend.users_app.views import UserViewSet
from backend.structures_app.views import (
    DiseaseViewSet,
    ServiceViewSet,
    StructureViewSet,
    search_structures,
)
from backend.resources_app.views import ResourceViewSet
from backend.audit_app.views import AuditLogViewSet

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"structures", StructureViewSet, basename="structure")
router.register(r"services", ServiceViewSet, basename="service")
router.register(r"diseases", DiseaseViewSet, basename="disease")
router.register(r"resources", ResourceViewSet, basename="resource")
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")

urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT auth
    path(
        "api/auth/token/",
        MediCentralTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # API router
    path("api/", include(router.urls)),
    # Search endpoint
    path("api/search/", search_structures, name="search_structures"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

