import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  CreateResourcePayload,
  GeoPoint,
  ResourceItem,
  StructureItem,
  StructurePayload
} from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-resources-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-resources-page.component.html',
  styleUrls: ['./admin-resources-page.component.css']
})
export class AdminResourcesPageComponent implements OnInit {
  readonly resources = signal<ResourceItem[]>([]);
  readonly structure = signal<StructureItem | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isSavingStructure = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly structureMessage = signal('');
  readonly editingResourceId = signal<number | null>(null);

  readonly totalBlood = computed(() => this.totalForType('Sang'));
  readonly totalOxygen = computed(() => this.totalForType('Oxygene'));
  readonly totalIncubator = computed(() => this.totalForType('Couveuse'));
  readonly totalMedicine = computed(() => this.totalForType('Medicament'));

  form: CreateResourcePayload = {
    resource_type: 'Sang',
    name_or_group: '',
    quantity: 0,
    unit: '',
    status: 'Disponible',
    blood_group: ''
  };

  structureForm = {
    name: '',
    type: 'Hopital',
    address: '',
    contact_phone: '',
    is_active: true,
    latitude: 3.8667,
    longitude: 11.5167
  };

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadResources();
    this.loadStructure();
  }

  trackById = (_: number, resource: ResourceItem): number => resource.id;

  onSubmit(): void {
    if (!this.form.name_or_group.trim() || !this.form.unit.trim()) {
      this.errorMessage.set('Variante/Groupe et unité sont requis.');
      return;
    }
    if (this.form.quantity < 0) {
      this.errorMessage.set('La quantité doit être positive.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const payload: CreateResourcePayload = {
      resource_type: this.form.resource_type,
      name_or_group: this.form.name_or_group.trim(),
      quantity: this.form.quantity,
      unit: this.form.unit.trim(),
      status: this.form.status,
      blood_group: this.form.resource_type === 'Sang' ? this.form.blood_group : ''
    };
    const editId = this.editingResourceId();
    const request$ = editId ? this.api.updateResource(editId, payload) : this.api.createResource(payload);
    request$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set(editId ? 'Ressource mise à jour.' : 'Ressource enregistrée.');
        this.resetForm();
        this.loadResources();
      },
      error: () => {
        this.isSaving.set(false);
        this.errorMessage.set("Échec de l'enregistrement de la ressource.");
      }
    });
  }

  onEdit(resource: ResourceItem): void {
    this.editingResourceId.set(resource.id);
    this.form = {
      resource_type: resource.resource_type,
      name_or_group: resource.name_or_group,
      quantity: resource.quantity,
      unit: resource.unit,
      status: resource.status,
      blood_group: resource.blood_group || ''
    };
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  onDelete(resource: ResourceItem): void {
    const confirmed = window.confirm(`Supprimer la ressource ${resource.name_or_group} ?`);
    if (!confirmed) {
      return;
    }
    this.api.deleteResource(resource.id).subscribe({
      next: () => {
        if (this.editingResourceId() === resource.id) {
          this.resetForm();
        }
        this.successMessage.set('Ressource supprimée.');
        this.loadResources();
      },
      error: () => {
        this.errorMessage.set('Suppression impossible.');
      }
    });
  }

  onCancelEdit(): void {
    this.resetForm();
  }

  onResourceTypeChange(): void {
    if (this.form.resource_type !== 'Sang') {
      this.form.blood_group = '';
    }
  }

  saveStructureInfo(): void {
    if (!this.structureForm.name.trim() || !this.structureForm.address.trim()) {
      this.structureMessage.set('Nom et adresse sont requis.');
      return;
    }

    this.isSavingStructure.set(true);
    this.structureMessage.set('');
    const payload: Partial<StructurePayload> = {
      name: this.structureForm.name.trim(),
      type: this.structureForm.type,
      address: this.structureForm.address.trim(),
      contact_phone: this.structureForm.contact_phone.trim(),
      is_active: this.structureForm.is_active,
      location: {
        type: 'Point',
        coordinates: [this.structureForm.longitude, this.structureForm.latitude]
      }
    };
    this.api.updateMyStructure(payload).subscribe({
      next: (data) => {
        this.isSavingStructure.set(false);
        this.structure.set(data);
        this.structureMessage.set('Informations de la structure mises à jour.');
      },
      error: () => {
        this.isSavingStructure.set(false);
        this.structureMessage.set('Mise à jour de la structure impossible.');
      }
    });
  }

  private loadResources(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.api.getResources().subscribe({
      next: (data) => {
        this.resources.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Impossible de charger les ressources.');
      }
    });
  }

  private loadStructure(): void {
    this.api.getMyStructure().subscribe({
      next: (data) => {
        this.structure.set(data);
        const coordinates = this.extractCoordinates(data.location);
        this.structureForm = {
          name: data.name,
          type: data.type,
          address: data.address,
          contact_phone: data.contact_phone ?? '',
          is_active: data.is_active,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        };
      },
      error: () => {
        this.structureMessage.set('Impossible de charger les informations de la structure.');
      }
    });
  }

  private totalForType(type: string): number {
    return this.resources()
      .filter((resource) => resource.resource_type === type)
      .reduce((sum, resource) => sum + resource.quantity, 0);
  }

  private resetForm(): void {
    this.editingResourceId.set(null);
    this.form = {
      resource_type: 'Sang',
      name_or_group: '',
      quantity: 0,
      unit: '',
      status: 'Disponible',
      blood_group: ''
    };
  }

  private extractCoordinates(location: GeoPoint | string | null): {
    latitude: number;
    longitude: number;
  } {
    if (location && typeof location !== 'string') {
      const [longitude, latitude] = location.coordinates;
      return { latitude, longitude };
    }
    if (typeof location === 'string') {
      const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(location);
      if (match) {
        return { latitude: Number(match[2]), longitude: Number(match[1]) };
      }
    }
    return { latitude: 3.8667, longitude: 11.5167 };
  }
}


