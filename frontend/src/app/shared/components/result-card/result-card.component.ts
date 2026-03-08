import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StructureSearchResult } from '../../../core/services/api.service';

@Component({
  selector: 'app-result-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './result-card.component.html',
  styleUrls: ['./result-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResultCardComponent {
  @Input({ required: true }) structure!: StructureSearchResult;
  @Output() focusOnMap = new EventEmitter<StructureSearchResult>();

  onVoirSurCarte(): void {
    this.focusOnMap.emit(this.structure);
  }

  trackByResource = (_: number, resource: StructureSearchResult['resources'][number]): number =>
    resource.id;

  visibleResources(): StructureSearchResult['resources'] {
    return this.structure.resources.slice(0, 4);
  }

  hiddenResourcesCount(): number {
    return Math.max(0, this.structure.resources.length - 4);
  }
}


