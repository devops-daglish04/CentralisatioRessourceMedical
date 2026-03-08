import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, StructureSearchResult } from '../../../core/services/api.service';
import { MapComponent } from '../../../shared/components/map/map.component';
import { FilterPanelComponent } from '../../../shared/components/filter-panel/filter-panel.component';
import { StructureCardComponent } from '../../../shared/components/structure-card/structure-card.component';
import {
  DEFAULT_SEARCH_FILTERS,
  ResourceFilter,
  SearchFilters,
  StructureTypeFilter
} from '../public-search.types';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MapComponent,
    FilterPanelComponent,
    StructureCardComponent
  ],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.css']
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  readonly results = signal<StructureSearchResult[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly showFilters = signal(false);
  readonly focusedId = signal<number | null>(null);
  readonly userLocation = signal<[number, number] | null>(null);
  filters: SearchFilters = { ...DEFAULT_SEARCH_FILTERS };

  private queryParamsSub: Subscription | null = null;
  private watchPositionId: number | null = null;
  private lastTrackedPosition: [number, number] | null = null;

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const latitude = this.parseNumber(params.get('latitude'));
      const longitude = this.parseNumber(params.get('longitude'));
      this.filters = {
        query: params.get('query') ?? '',
        city: params.get('city') ?? 'Yaounde',
        structureType: (params.get('type') as StructureTypeFilter) ?? '',
        resource: (params.get('resource') as ResourceFilter) ?? '',
        bloodGroup: params.get('blood_group') ?? '',
        availability: this.parseBool(params.get('availability'), true),
        radius: this.parseNumber(params.get('radius')) ?? 10
      };

      if (latitude !== null && longitude !== null) {
        this.userLocation.set([latitude, longitude]);
        this.lastTrackedPosition = [latitude, longitude];
        this.startLocationWatch();
      } else {
        this.userLocation.set(null);
      }

      this.fetchResults();
    });
  }

  ngOnDestroy(): void {
    this.queryParamsSub?.unsubscribe();
    if (this.watchPositionId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }

  onToggleFilters(): void {
    this.showFilters.set(!this.showFilters());
  }

  onFiltersChanged(next: SearchFilters): void {
    this.filters = { ...next };
  }

  onSubmitFilters(next: SearchFilters): void {
    this.filters = { ...next };
    void this.navigateWithFilters();
  }

  onSubmitTopSearch(): void {
    void this.navigateWithFilters();
  }

  onOpenDetails(structureId: number): void {
    void this.router.navigate(['/public/structure', structureId]);
  }

  onFocusOnMap(structureId: number): void {
    this.focusedId.set(structureId);
  }

  trackById = (_: number, item: StructureSearchResult): number => item.id;

  private fetchResults(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const location = this.userLocation();
    this.api
      .searchStructures({
        query: this.filters.query,
        city: this.filters.city,
        type: this.filters.structureType || undefined,
        resource: this.filters.resource || undefined,
        bloodGroup: this.filters.bloodGroup || undefined,
        availability: this.filters.availability,
        radius: this.filters.radius,
        latitude: location?.[0],
        longitude: location?.[1],
        limit: 80,
        includeResources: true,
        includeServices: false
      })
      .subscribe({
        next: (data) => {
          this.results.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set(
            "Impossible de charger les structures. Verifiez vos filtres ou la connexion a l'API."
          );
          this.isLoading.set(false);
        }
      });
  }

  private async navigateWithFilters(): Promise<void> {
    const location = this.userLocation();
    const queryParams: Record<string, string | number | boolean> = {
      query: this.filters.query,
      city: this.filters.city,
      resource: this.filters.resource,
      blood_group: this.filters.bloodGroup,
      availability: this.filters.availability,
      radius: this.filters.radius
    };
    if (this.filters.structureType) {
      queryParams['type'] = this.filters.structureType;
    }
    if (location) {
      queryParams['latitude'] = location[0];
      queryParams['longitude'] = location[1];
    }
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams
    });
  }

  private startLocationWatch(): void {
    if (!navigator.geolocation || this.watchPositionId !== null) {
      return;
    }
    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude];
        if (!this.lastTrackedPosition) {
          this.lastTrackedPosition = next;
          this.userLocation.set(next);
          this.fetchResults();
          return;
        }

        const movedKm = this.distanceKm(this.lastTrackedPosition, next);
        if (movedKm >= 0.2) {
          this.lastTrackedPosition = next;
          this.userLocation.set(next);
          this.fetchResults();
        }
      },
      () => {
        // Keep current results if geolocation updates are not available.
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  private distanceKm(from: [number, number], to: [number, number]): number {
    const toRad = (value: number): number => (value * Math.PI) / 180;
    const [lat1, lng1] = from;
    const [lat2, lng2] = to;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private parseNumber(value: string | null): number | null {
    if (value === null || value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseBool(value: string | null, defaultValue: boolean): boolean {
    if (value === null) {
      return defaultValue;
    }
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }
}
