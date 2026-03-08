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
}
