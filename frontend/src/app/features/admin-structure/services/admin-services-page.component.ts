import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ApiService, ServiceItem, StructureItem } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-services-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-services-page.component.html',
  styleUrls: ['./admin-services-page.component.css']
})
export class AdminServicesPageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly message = signal('');
  readonly services = signal<ServiceItem[]>([]);
  readonly selectedServiceIds = signal<number[]>([]);
  readonly structure = signal<StructureItem | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  onToggleService(serviceId: number): void {
    const current = new Set(this.selectedServiceIds());
    if (current.has(serviceId)) {
      current.delete(serviceId);
    } else {
      current.add(serviceId);
    }
    this.selectedServiceIds.set(Array.from(current).sort((a, b) => a - b));
  }

  saveServices(): void {
    this.isSaving.set(true);
    this.message.set('');
    this.api
      .updateMyStructure({
        service_ids: this.selectedServiceIds()
      })
      .subscribe({
        next: (structure) => {
          this.isSaving.set(false);
          this.structure.set(structure);
          this.message.set('Services mis à jour.');
          this.selectedServiceIds.set(
            (structure.services ?? []).map((service) => service.id).sort((a, b) => a - b)
          );
        },
        error: () => {
          this.isSaving.set(false);
          this.message.set('Impossible de mettre à jour les services.');
        }
      });
  }

  isSelected(serviceId: number): boolean {
    return this.selectedServiceIds().includes(serviceId);
  }

  diseaseNames(service: ServiceItem): string {
    return service.diseases.map((disease) => disease.name).join(', ');
  }

  trackByServiceId = (_: number, service: ServiceItem): number => service.id;

  private loadData(): void {
    this.isLoading.set(true);
    this.message.set('');

    this.api.getMyStructure().subscribe({
      next: (structure) => {
        this.structure.set(structure);
        this.selectedServiceIds.set(
          (structure.services ?? []).map((service) => service.id).sort((a, b) => a - b)
        );
        this.api.getServices().subscribe({
          next: (services) => {
            this.services.set(services);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
            this.message.set('Impossible de charger la liste des services.');
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.message.set('Impossible de charger la structure.');
      }
    });
  }
}
