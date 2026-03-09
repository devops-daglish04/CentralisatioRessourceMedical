from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Roles(models.TextChoices):
        PUBLIC = "PUBLIC", "Public"
        STRUCTURE_ADMIN = "STRUCTURE_ADMIN", "Structure admin"
        ADMIN_STRUCTURE = "ADMIN_STRUCTURE", "Admin structure"
        SUPER_ADMIN = "SUPER_ADMIN", "Super admin"

    role = models.CharField(
        max_length=32,
        choices=Roles.choices,
        default=Roles.PUBLIC,
        help_text="Rôle de l'utilisateur dans la plateforme",
    )
    structure = models.ForeignKey(
        "structures_app.Structure",
        related_name="admins",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Structure rattachée pour les comptes STRUCTURE_ADMIN",
    )
    profile_picture = models.ImageField(
        upload_to="profiles/",
        null=True,
        blank=True,
        help_text="Photo de profil de l'utilisateur.",
    )

    def save(self, *args, **kwargs):
        if self.role == self.Roles.STRUCTURE_ADMIN:
            self.role = self.Roles.ADMIN_STRUCTURE
        if self.is_superuser and self.role == self.Roles.PUBLIC:
            self.role = self.Roles.SUPER_ADMIN
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"


