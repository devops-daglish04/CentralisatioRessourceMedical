import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, ResourceItem, StructureItem } from '../../../core/services/api.service';

@Component({
  selector: 'app-structure-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './structure-details.component.html',
  styleUrls: ['./structure-details.component.css']
})
export class StructureDetailsComponent implements OnInit {
  readonly structure = signal<StructureItem | null>(null);
  readonly resources = signal<ResourceItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.errorMessage.set('Identifiant de structure invalide.');
      this.isLoading.set(false);
      return;
    }

    this.api.getStructure(id).subscribe({
      next: (structure) => {
        this.structure.set(structure);
        this.api.getResources().subscribe({
          next: (resources) => {
            this.resources.set(resources.filter((item) => item.structure === id));
            this.isLoading.set(false);
          },
          error: () => {
            this.errorMessage.set('Impossible de charger les ressources.');
            this.isLoading.set(false);
          }
        });
      },
      error: () => {
        this.errorMessage.set('Structure introuvable.');
        this.isLoading.set(false);
      }
    });
  }
}
