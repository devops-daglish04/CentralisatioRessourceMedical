import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, GeoPoint, StructureItem, StructurePayload } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-structure-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-structure-profile-page.component.html',
  styleUrls: ['./admin-structure-profile-page.component.css']
})
export class AdminStructureProfilePageComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly message = signal('');
  readonly structure = signal<StructureItem | null>(null);

  form = {
    name: '',
    type: 'Hopital',
    address: '',
    contact_phone: '',
    is_active: true,
    latitude: 3.8667,
    longitude: 11.5167
  };

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.loadStructure();
  }

  onSubmit(): void {
    if (!this.form.name.trim() || !this.form.address.trim()) {
      this.message.set('Nom et adresse sont requis.');
      return;
    }
    this.isSaving.set(true);
    this.message.set('');

    const payload: Partial<StructurePayload> = {
      name: this.form.name.trim(),
      type: this.form.type,
      address: this.form.address.trim(),
      contact_phone: this.form.contact_phone.trim(),
      is_active: this.form.is_active,
      location: {
        type: 'Point',
        coordinates: [this.form.longitude, this.form.latitude]
      }
    };

    this.api.updateMyStructure(payload).subscribe({
      next: (structure) => {
        this.isSaving.set(false);
        this.structure.set(structure);
        this.message.set('Profil structure mis à jour.');
      },
      error: () => {
        this.isSaving.set(false);
        this.message.set('Impossible de mettre à jour le profil structure.');
      }
    });
  }

  private loadStructure(): void {
    this.isLoading.set(true);
    this.message.set('');
    this.api.getMyStructure().subscribe({
      next: (structure) => {
        this.structure.set(structure);
        const coordinates = this.extractCoordinates(structure.location);
        this.form = {
          name: structure.name,
          type: structure.type,
          address: structure.address,
          contact_phone: structure.contact_phone ?? '',
          is_active: structure.is_active,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        };
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.message.set('Impossible de charger la structure.');
      }
    });
  }

  private extractCoordinates(location: GeoPoint | string | null): {
    latitude: number;
    longitude: number;
  } {
    if (location && typeof location !== 'string') {
      const [longitude, latitude] = location.coordinates;
      return { latitude, longitude };
    }
    if (typeof location === 'string') {
      const match = /POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i.exec(location);
      if (match) {
        return { latitude: Number(match[2]), longitude: Number(match[1]) };
      }
    }
    return { latitude: 3.8667, longitude: 11.5167 };
  }
}
