from django.contrib.gis.db import models as gis_models
from django.db import models


class Structure(gis_models.Model):
    HOSPITAL = "Hopital"
    PHARMACY = "Pharmacie"
    BLOOD_BANK = "Banque"

    TYPE_CHOICES = [
        (HOSPITAL, "Hôpital"),
        (PHARMACY, "Pharmacie"),
        (BLOOD_BANK, "Banque de sang"),
    ]

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=32, choices=TYPE_CHOICES)
    address = models.CharField(max_length=512)
    contact_phone = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    # PostGIS point field (longitude, latitude – WGS84)
    location = gis_models.PointField(geography=True, srid=4326)

    class Meta:
        verbose_name = "Structure"
        verbose_name_plural = "Structures"
        indexes = [
            models.Index(fields=["is_active", "type"]),
            models.Index(fields=["is_active", "name"]),
        ]

    def __str__(self) -> str:
        return self.name


class Service(models.Model):
    name = models.CharField(max_length=255)
    structures = models.ManyToManyField(
        Structure,
        related_name="services",
        blank=True,
    )

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        indexes = [models.Index(fields=["name"])]

    def __str__(self) -> str:
        return self.name


class Disease(models.Model):
    name = models.CharField(max_length=255)
    services = models.ManyToManyField(
        Service,
        related_name="diseases",
        blank=True,
    )

    class Meta:
        verbose_name = "Maladie"
        verbose_name_plural = "Maladies"
        indexes = [models.Index(fields=["name"])]

    def __str__(self) -> str:
        return self.name


