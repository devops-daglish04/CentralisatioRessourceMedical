from django.db import models

from backend.structures_app.models import Structure


class Resource(models.Model):
    BLOOD = "Sang"
    MEDICINE = "Medicament"
    OXYGEN = "Oxygene"
    INCUBATOR = "Couveuse"

    RESOURCE_TYPE_CHOICES = [
        (BLOOD, "Sang"),
        (MEDICINE, "Médicament"),
        (OXYGEN, "Oxygène"),
        (INCUBATOR, "Couveuse"),
    ]

    AVAILABLE = "Disponible"
    CRITICAL = "Critique"
    OUT_OF_STOCK = "Rupture"

    STATUS_CHOICES = [
        (AVAILABLE, "Disponible"),
        (CRITICAL, "Critique"),
        (OUT_OF_STOCK, "Rupture"),
    ]

    BLOOD_GROUP_CHOICES = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    structure = models.ForeignKey(
        Structure,
        related_name="resources",
        on_delete=models.CASCADE,
    )
    resource_type = models.CharField(max_length=32, choices=RESOURCE_TYPE_CHOICES)
    name_or_group = models.CharField(
        max_length=255,
        help_text="Nom de la ressource ou groupe sanguin",
    )
    quantity = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=64)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES)
    blood_group = models.CharField(
        max_length=3,
        choices=BLOOD_GROUP_CHOICES,
        blank=True,
        help_text="Groupe sanguin (optionnel, principalement pour les ressources Sang).",
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Ressource"
        verbose_name_plural = "Ressources"
        indexes = [
            models.Index(fields=["structure", "resource_type", "status"]),
            models.Index(fields=["last_updated"]),
        ]

    def __str__(self) -> str:
        return f"{self.resource_type} - {self.name_or_group} ({self.structure.name})"

    @property
    def availability(self) -> bool:
        return self.status != self.OUT_OF_STOCK and self.quantity > 0


