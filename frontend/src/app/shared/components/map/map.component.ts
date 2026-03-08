import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { StructureSearchResult } from '../../../core/services/api.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() structures: StructureSearchResult[] = [];
  @Input() focusStructureId: number | null = null;
  @Input() userLocation: L.LatLngExpression | null = null;
  readonly mapError = signal('');

  private map: L.Map | null = null;
  private userLayer = L.layerGroup();
  private structureClusterLayer: L.LayerGroup | null = null;
  private invalidateHandle: ReturnType<typeof setTimeout> | null = null;
  private fallbackTilesLoaded = false;

  ngAfterViewInit(): void {
    try {
      this.map = L.map('medi-map', {
        zoomControl: true,
        minZoom: 2,
        maxZoom: 20,
        preferCanvas: true
      }).setView([3.8667, 11.5167], 12);

      const primaryTiles = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 20,
          maxNativeZoom: 20,
          attribution: ''
        }
      );
      primaryTiles.on('tileerror', () => this.loadFallbackTiles());
      primaryTiles.addTo(this.map);

      this.userLayer.addTo(this.map);
      this.structureClusterLayer = (L as unknown as { markerClusterGroup: (options: object) => L.LayerGroup }).markerClusterGroup({
        chunkedLoading: true,
        chunkDelay: 20,
        chunkInterval: 120,
        maxClusterRadius: 55,
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true
      });
      this.structureClusterLayer.addTo(this.map);
      this.renderMarkers();
      this.invalidateSizeSoon();
    } catch {
      this.mapError.set("Impossible d'initialiser la carte.");
    }
  }

  ngOnChanges(): void {
    if (this.map) {
      try {
        this.renderMarkers();
        this.invalidateSizeSoon();
      } catch {
        this.mapError.set('Erreur de rendu de la carte.');
      }
    }
  }

  ngOnDestroy(): void {
    if (this.invalidateHandle) {
      clearTimeout(this.invalidateHandle);
      this.invalidateHandle = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.invalidateSizeSoon();
  }

  private renderMarkers(): void {
    if (!this.map || !this.structureClusterLayer) {
      return;
    }
    const clusterLayer = this.structureClusterLayer;
    this.userLayer.clearLayers();
    (clusterLayer as unknown as { clearLayers: () => void }).clearLayers();

    if (this.userLocation) {
      L.circleMarker(this.userLocation, {
        radius: 7,
        color: '#2563EB',
        fillColor: '#2563EB',
        fillOpacity: 0.9
      }).addTo(this.userLayer);
    }

    this.structures.forEach((structure) => {
      const [lat, lng] = this.toLatLng(structure);
      const isFocused = this.focusStructureId === structure.id;
      const marker = L.marker([lat, lng], {
        icon: L.divIcon({
          html: `<div class="map-marker ${isFocused ? 'map-marker--active' : ''}"></div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      });

      marker
        .bindPopup(
          this.buildPopupHtml(structure, lat, lng)
        )
        .addTo(clusterLayer);
    });

    if (this.focusStructureId) {
      const focused = this.structures.find((s) => s.id === this.focusStructureId);
      if (focused) {
        const [lat, lng] = this.toLatLng(focused);
        this.map.setView([lat, lng], 16, { animate: true });
      }
      return;
    }

    this.fitBoundsToData();
  }

  private fitBoundsToData(): void {
    if (!this.map) {
      return;
    }

    const points: L.LatLngTuple[] = [];
    if (this.userLocation) {
      const userPoint = this.userLocation as [number, number];
      points.push([userPoint[0], userPoint[1]]);
    }

    for (const structure of this.structures) {
      const [lat, lng] = this.toLatLng(structure);
      points.push([lat, lng]);
    }

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  private invalidateSizeSoon(): void {
    if (!this.map) {
      return;
    }
    if (this.invalidateHandle) {
      clearTimeout(this.invalidateHandle);
    }
    this.invalidateHandle = setTimeout(() => {
      this.map?.invalidateSize({ animate: false });
      this.invalidateHandle = null;
    }, 80);
  }

  private loadFallbackTiles(): void {
    if (!this.map || this.fallbackTilesLoaded) {
      return;
    }
    this.fallbackTilesLoaded = true;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 20,
      attribution: ''
    }).addTo(this.map);
  }

  private toLatLng(structure: StructureSearchResult): [number, number] {
    if (Number.isFinite(structure.latitude) && Number.isFinite(structure.longitude)) {
      return [structure.latitude, structure.longitude];
    }
    const [lng, lat] = structure.location.coordinates;
    return [lat, lng];
  }

  private buildPopupHtml(structure: StructureSearchResult, lat: number, lng: number): string {
    const resources = structure.resources
      .slice(0, 2)
      .map((item) => `${item.resource_type}: ${item.name_or_group}`)
      .join(' | ');
    const itinerary = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const details = `/public/structure/${structure.id}`;
    return `
      <div style="min-width:220px;font-family:Arial,sans-serif;">
        <div style="font-weight:700;margin-bottom:6px;">${structure.name}</div>
        <div style="font-size:12px;color:#475569;margin-bottom:4px;">${structure.distance.toFixed(1)} km</div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px;">${resources || 'Ressources non renseignees'}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <a href="${details}" style="padding:6px 10px;border-radius:999px;background:#1d4ed8;color:white;text-decoration:none;font-size:12px;">Voir details</a>
          <a href="${itinerary}" target="_blank" rel="noopener" style="padding:6px 10px;border-radius:999px;background:#e2e8f0;color:#1e293b;text-decoration:none;font-size:12px;">Itineraire</a>
        </div>
      </div>
    `;
  }
}


