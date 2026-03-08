import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ResultCardComponent } from '../../shared/components/result-card/result-card.component';
import { MapComponent } from '../../shared/components/map/map.component';
import { ApiService, StructureSearchResult } from '../../core/services/api.service';

@Component({
  selector: 'app-public-shell',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ResultCardComponent, MapComponent],
  templateUrl: './public-shell.component.html',
  styleUrls: ['./public-shell.component.css']
})
export class PublicShellComponent implements OnInit {
  readonly results = signal<StructureSearchResult[]>([]);
  readonly isLoading = signal(false);
  readonly focusedId = signal<number | null>(null);
  readonly userLocation = signal<[number, number] | null>(null);

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    // Chargement initial avec une position par défaut (centre de Yaoundé)
    this.performSearch(3.8667, 11.5167);
  }

  onLocateUser(): void {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.userLocation.set([lat, lng]);
        this.performSearch(lat, lng);
      },
      () => {
        // en cas de refus, garder la position par défaut
      }
    );
  }

  onFocus(structure: StructureSearchResult): void {
    this.focusedId.set(structure.id);
  }

  trackById = (_: number, structure: StructureSearchResult): number => structure.id;

  private performSearch(lat: number, lng: number): void {
    this.isLoading.set(true);
    this.api
      .searchStructures(lat, lng, {
        radiusKm: 30,
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
        this.isLoading.set(false);
      }
    });
  }
}
