import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { StructureSearchResult } from '../../../core/services/api.service';

@Component({
  selector: 'app-structure-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './structure-card.component.html',
  styleUrls: ['./structure-card.component.css']
})
export class StructureCardComponent {
  @Input({ required: true }) structure!: StructureSearchResult;
  @Output() viewDetails = new EventEmitter<number>();
  @Output() focusMap = new EventEmitter<number>();

  onViewDetails(): void {
    this.viewDetails.emit(this.structure.id);
  }

  onFocusMap(): void {
    this.focusMap.emit(this.structure.id);
  }

  itineraryLink(): string {
    const lat = this.structure.latitude;
    const lng = this.structure.longitude;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  trackByResourceId(index: number, resource: any): number {
    return resource.id || index;
  }

  hasAvailableResources(): boolean {
    return this.structure.resources.some(r => r.status === 'Disponible');
  }

  hasCriticalResources(): boolean {
    return this.structure.resources.some(r => r.status === 'Critique');
  }

  hasUnavailableResources(): boolean {
    return this.structure.resources.some(r => r.status === 'Rupture');
  }

  getStatusText(): string {
    if (this.hasAvailableResources()) return 'Disponible';
    if (this.hasCriticalResources()) return 'Critique';
    return 'Rupture';
  }

  getResourceIcon(resourceType: string): string {
    const icons: { [key: string]: string } = {
      'Sang': '🩸',
      'Medicament': '💊',
      'Oxygene': '🫁',
      'Couveuse': '👶'
    };
    return icons[resourceType] || '📦';
  }
}
