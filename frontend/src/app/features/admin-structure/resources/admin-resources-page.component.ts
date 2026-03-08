import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, CreateResourcePayload, ResourceItem } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-resources-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-resources-page.component.html',
  styleUrls: ['./admin-resources-page.component.css']
})
export class AdminResourcesPageComponent implements OnInit {
  readonly resources = signal<ResourceItem[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly totalBlood = computed(() => this.totalForType('Sang'));
  readonly totalOxygen = computed(() => this.totalForType('Oxygene'));
  readonly totalIncubator = computed(() => this.totalForType('Couveuse'));
  readonly totalMedicine = computed(() => this.totalForType('Medicament'));

  form: CreateResourcePayload = {
    resource_type: 'Sang',
    name_or_group: '',
    quantity: 0,
    unit: '',
    status: 'Disponible'
  };

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadResources();
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
    this.api
      .createResource({
        resource_type: this.form.resource_type,
        name_or_group: this.form.name_or_group.trim(),
        quantity: this.form.quantity,
        unit: this.form.unit.trim(),
        status: this.form.status
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Ressource enregistrée.');
          this.form = {
            resource_type: this.form.resource_type,
            name_or_group: '',
            quantity: 0,
            unit: '',
            status: 'Disponible'
          };
          this.loadResources();
        },
        error: () => {
          this.isSaving.set(false);
          this.errorMessage.set("Échec de l'enregistrement de la ressource.");
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

  private totalForType(type: string): number {
    return this.resources()
      .filter((resource) => resource.resource_type === type)
      .reduce((sum, resource) => sum + resource.quantity, 0);
  }
}


