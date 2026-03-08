import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  AuditLogItem,
  GeoPoint,
  StructureItem,
  StructurePayload
} from '../../../core/services/api.service';

type StructureModalMode = 'create' | 'edit' | 'view';

interface StructureDraft {
  id: number | null;
  name: string;
  type: string;
  city: string;
  addressLine: string;
  contactPhone: string;
  isActive: boolean;
  latitude: number;
  longitude: number;
}

interface AdminDraft {
  email: string;
  username: string;
  structureId: number | null;
}

@Component({
  selector: 'app-super-admin-structures-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-structures-page.component.html',
  styleUrls: ['./super-admin-structures-page.component.css']
})
export class SuperAdminStructuresPageComponent implements OnInit {
  structures: StructureItem[] = [];
  audits: AuditLogItem[] = [];

  isLoading = true;
  isSavingStructure = false;
  isSavingAdmin = false;
  isDeletingStructure = false;

  searchTerm = '';
  selectedType = 'ALL';
  selectedCity = 'ALL';

  structureModalOpen = false;
  structureModalMode: StructureModalMode = 'create';
  structureDraft: StructureDraft = this.emptyStructureDraft();

  pendingDelete: StructureItem | null = null;
  adminDraft: AdminDraft = this.emptyAdminDraft();

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.reloadDashboard();
  }

  get filteredStructures(): StructureItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.structures.filter((structure) => {
      const city = this.extractCity(structure.address);
      const matchesType = this.selectedType === 'ALL' || structure.type === this.selectedType;
      const matchesCity = this.selectedCity === 'ALL' || city === this.selectedCity;
      const matchesQuery =
        query.length === 0 ||
        structure.name.toLowerCase().includes(query) ||
        structure.address.toLowerCase().includes(query) ||
        structure.type.toLowerCase().includes(query);
      return matchesType && matchesCity && matchesQuery;
    });
  }

  get availableTypes(): string[] {
    return Array.from(new Set(this.structures.map((item) => item.type))).sort((a, b) =>
      a.localeCompare(b)
    );
  }

  get availableCities(): string[] {
    return Array.from(new Set(this.structures.map((item) => this.extractCity(item.address)))).sort(
      (a, b) => a.localeCompare(b)
    );
  }

  get isStructureFormReadOnly(): boolean {
    return this.structureModalMode === 'view';
  }

  get structureModalTitle(): string {
    if (this.structureModalMode === 'create') {
      return 'Creer une structure';
    }
    if (this.structureModalMode === 'edit') {
      return 'Modifier la structure';
    }
    return 'Detail de la structure';
  }

  get structureModalActionLabel(): string {
    return this.structureModalMode === 'edit' ? 'Enregistrer' : 'Creer';
  }

  reloadDashboard(): void {
    this.isLoading = true;
    let pending = 2;
    const markDone = () => {
      pending -= 1;
      if (pending <= 0) {
        this.isLoading = false;
      }
    };

    this.api.getStructures().subscribe({
      next: (data) => {
        this.structures = data;
      },
      error: () => {
        this.structures = [];
        markDone();
      },
      complete: markDone
    });

    this.api.getAuditLogs().subscribe({
      next: (data) => {
        this.audits = data.slice(0, 40);
      },
      error: () => {
        this.audits = [];
        markDone();
      },
      complete: markDone
    });
  }

  openCreateStructureModal(): void {
    this.structureModalMode = 'create';
    this.structureDraft = this.emptyStructureDraft();
    this.structureModalOpen = true;
  }

  openEditStructureModal(structure: StructureItem): void {
    this.structureModalMode = 'edit';
    this.structureDraft = this.toStructureDraft(structure);
    this.structureModalOpen = true;
  }

  openViewStructureModal(structure: StructureItem): void {
    this.structureModalMode = 'view';
    this.structureDraft = this.toStructureDraft(structure);
    this.structureModalOpen = true;
  }

  closeStructureModal(): void {
    this.structureModalOpen = false;
    this.structureDraft = this.emptyStructureDraft();
    this.isSavingStructure = false;
  }

  saveStructure(): void {
    if (this.structureModalMode === 'view') {
      this.closeStructureModal();
      return;
    }

    const name = this.structureDraft.name.trim();
    const addressLine = this.structureDraft.addressLine.trim();
    const city = this.structureDraft.city.trim();
    if (!name || !addressLine || !city) {
      window.alert('Nom, adresse et ville sont obligatoires.');
      return;
    }

    const payload: StructurePayload = {
      name,
      type: this.structureDraft.type,
      address: `${addressLine}, ${city}`,
      contact_phone: this.structureDraft.contactPhone.trim(),
      is_active: this.structureDraft.isActive,
      location: {
        type: 'Point',
        coordinates: [this.structureDraft.longitude, this.structureDraft.latitude]
      }
    };

    this.isSavingStructure = true;
    const request$ =
      this.structureModalMode === 'edit' && this.structureDraft.id !== null
        ? this.api.updateStructure(this.structureDraft.id, payload)
        : this.api.createStructure(payload);

    request$.subscribe({
      next: () => {
        this.closeStructureModal();
        this.reloadDashboard();
      },
      error: (error: unknown) => {
        this.isSavingStructure = false;
        window.alert(this.toErrorMessage(error, "Echec de l'enregistrement de la structure."));
      }
    });
  }

  requestDeleteStructure(structure: StructureItem): void {
    this.pendingDelete = structure;
  }

  cancelDeleteStructure(): void {
    this.pendingDelete = null;
  }

  confirmDeleteStructure(): void {
    if (!this.pendingDelete) {
      return;
    }
    const structure = this.pendingDelete;
    this.isDeletingStructure = true;
    this.api.deleteStructure(structure.id).subscribe({
      next: () => {
        this.pendingDelete = null;
        this.isDeletingStructure = false;
        this.reloadDashboard();
      },
      error: (error: unknown) => {
        this.isDeletingStructure = false;
        window.alert(this.toErrorMessage(error, 'Suppression impossible.'));
      }
    });
  }

  createStructureAdmin(): void {
    const email = this.adminDraft.email.trim().toLowerCase();
    const username = this.adminDraft.username.trim();
    const structureId = this.adminDraft.structureId;

    if (!email || !username || structureId === null) {
      window.alert('Email, nom et structure associee sont obligatoires.');
      return;
    }

    const temporaryPassword = this.generateTemporaryPassword();
    this.isSavingAdmin = true;
    this.api
      .createUser({
        username,
        email,
        role: 'STRUCTURE_ADMIN',
        structure: structureId,
        password: temporaryPassword,
        is_active: true
      })
      .subscribe({
        next: () => {
          this.isSavingAdmin = false;
          this.adminDraft = this.emptyAdminDraft();
          window.alert(`Compte admin cree. Mot de passe provisoire: ${temporaryPassword}`);
          this.reloadDashboard();
        },
        error: (error: unknown) => {
          this.isSavingAdmin = false;
          window.alert(this.toErrorMessage(error, 'Creation de compte admin impossible.'));
        }
      });
  }

  formatAuditAction(action: string): string {
    const actionMap: Record<string, string> = {
      STRUCTURE_CREATED: 'Creation structure',
      STRUCTURE_UPDATED: 'Mise a jour structure',
      STRUCTURE_DELETED: 'Suppression structure',
      ADMIN_ACCOUNT_CREATED: 'Creation compte admin',
      ADMIN_ACCOUNT_UPDATED: 'Mise a jour compte admin',
      ADMIN_ACCOUNT_DELETED: 'Suppression compte admin',
      RESOURCE_CREATED: 'Creation ressource',
      RESOURCE_UPDATED: 'Mise a jour ressource',
      RESOURCE_DELETED: 'Suppression ressource'
    };
    return actionMap[action] ?? action;
  }

  formatAuditActor(audit: AuditLogItem): string {
    if (audit.user_email) {
      return audit.user_email;
    }
    if (audit.user !== null) {
      return `Admin #${audit.user}`;
    }
    return 'Systeme';
  }

  formatTimestamp(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getLastUpdateForStructure(structureId: number): string {
    const audit = this.audits.find(
      (item) => item.structure === structureId && item.action.startsWith('STRUCTURE_')
    );
    return audit ? this.formatTimestamp(audit.timestamp) : '-';
  }

  structureStatusClass(isActive: boolean): string {
    return isActive ? 'status-pill status-pill-active' : 'status-pill status-pill-inactive';
  }

  trackByStructure = (_: number, item: StructureItem): number => item.id;
  trackByAudit = (_: number, item: AuditLogItem): number => item.id;

  private emptyStructureDraft(): StructureDraft {
    return {
      id: null,
      name: '',
      type: 'Hopital',
      city: 'Yaounde',
      addressLine: '',
      contactPhone: '',
      isActive: true,
      latitude: 3.8667,
      longitude: 11.5167
    };
  }

  private emptyAdminDraft(): AdminDraft {
    return {
      email: '',
      username: '',
      structureId: null
    };
  }

  private toStructureDraft(structure: StructureItem): StructureDraft {
    const splitAddress = this.splitAddress(structure.address);
    const coords = this.extractCoordinates(structure.location);
    return {
      id: structure.id,
      name: structure.name,
      type: structure.type,
      city: splitAddress.city,
      addressLine: splitAddress.addressLine,
      contactPhone: structure.contact_phone ?? '',
      isActive: structure.is_active,
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  }

  private splitAddress(address: string): { addressLine: string; city: string } {
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length >= 2) {
      return {
        addressLine: parts.slice(0, -1).join(', '),
        city: parts[parts.length - 1]
      };
    }
    return {
      addressLine: address.trim(),
      city: 'Yaounde'
    };
  }

  private extractCity(address: string): string {
    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return 'Inconnu';
    }
    return parts[parts.length - 1];
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

  private generateTemporaryPassword(length = 10): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let index = 0; index < length; index += 1) {
      password += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `${password}!`;
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }
    const maybeWithError = error as { error?: unknown };
    const responseBody = maybeWithError.error;
    if (typeof responseBody === 'string' && responseBody.trim()) {
      return responseBody;
    }
    if (responseBody && typeof responseBody === 'object') {
      const values = Object.values(responseBody as Record<string, unknown>);
      for (const value of values) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          return value[0];
        }
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }
    return fallback;
  }
}
