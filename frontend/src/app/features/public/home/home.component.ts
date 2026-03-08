import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FilterPanelComponent } from '../../../shared/components/filter-panel/filter-panel.component';
import {
  DEFAULT_SEARCH_FILTERS,
  ResourceFilter,
  SearchFilters
} from '../public-search.types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FilterPanelComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };
  readonly isSearching = signal(false);
  readonly errorMessage = signal('');

  constructor(private readonly router: Router) {}

  onFiltersChanged(next: SearchFilters): void {
    this.filters = { ...next };
  }

  onSearchWithCurrentFilters(): void {
    void this.search(this.filters);
  }

  onQuickSearch(resource: ResourceFilter): void {
    const next: SearchFilters = {
      ...this.filters,
      resource,
      query: this.filters.query || this.labelForResource(resource)
    };
    void this.search(next);
  }

  private async search(filters: SearchFilters): Promise<void> {
    this.isSearching.set(true);
    this.errorMessage.set('');

    const position = await this.requestLocation();
    const queryParams: Record<string, string | number | boolean> = {
      query: filters.query,
      city: filters.city,
      resource: filters.resource,
      blood_group: filters.bloodGroup,
      availability: filters.availability,
      radius: filters.radius
    };

    if (filters.structureType) {
      queryParams['type'] = filters.structureType;
    }
    if (position) {
      queryParams['latitude'] = position.latitude;
      queryParams['longitude'] = position.longitude;
    }
    if (!position && !filters.city.trim()) {
      this.errorMessage.set(
        'Geolocalisation refusee: veuillez renseigner une ville dans les filtres avances.'
      );
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(false);
    await this.router.navigate(['/public/results'], {
      queryParams
    });
  }

  private labelForResource(resource: ResourceFilter): string {
    if (resource === 'blood') {
      return 'Besoin de sang';
    }
    if (resource === 'medicine') {
      return 'Besoin de medicament';
    }
    if (resource === 'oxygen') {
      return "Besoin d'oxygene";
    }
    if (resource === 'incubator') {
      return 'Besoin de couveuse';
    }
    return '';
  }

  private requestLocation(): Promise<GeolocationCoordinates | null> {
    if (!navigator.geolocation) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }
}
