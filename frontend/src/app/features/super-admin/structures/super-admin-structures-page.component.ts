import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  GeoPoint,
  StructureItem,
  StructurePayload,
  UserItem,
  UserPayload
} from '../../../core/services/api.service';

type SectionKey = 'dashboard' | 'structures' | 'admins' | 'settings';
type StructureModalMode = 'create' | 'edit' | 'view';
type AdminModalMode = 'view' | 'edit';

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
  name: string;
  email: string;
  password: string;
  structureType: 'Hopital' | 'Pharmacie' | 'Banque' | '';
  structureName: string;
}

interface AdminEditDraft {
  id: number | null;
  name: string;
  email: string;
  structureId: number | null;
}

interface SuperAdminProfileDraft {
  username: string;
  email: string;
  profilePicture: File | null;
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
  users: UserItem[] = [];

  activeSection: SectionKey = 'dashboard';
  adminFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';
  adminSearchTerm = '';
  structureSearchTerm = '';

  isLoading = true;
  isSavingAdmin = false;
  isSavingStructure = false;
  isSavingProfile = false;
  isUpdatingAdminId: number | null = null;
  isDeletingAdminId: number | null = null;
  isDeletingStructure = false;

  createAdminModalOpen = false;
  adminModalOpen = false;
  adminModalMode: AdminModalMode = 'view';
  selectedAdmin: UserItem | null = null;

  structureModalOpen = false;
  structureModalMode: StructureModalMode = 'create';
  pendingDeleteStructure: StructureItem | null = null;

  adminDraft: AdminDraft = this.emptyAdminDraft();
  adminEditDraft: AdminEditDraft = this.emptyAdminEditDraft();
  structureDraft: StructureDraft = this.emptyStructureDraft();
  profileDraft: SuperAdminProfileDraft = this.emptyProfileDraft();
  profilePicturePreview = '';
  profileMessage = '';

  autoRefreshEnabled = true;
  showInactiveByDefault = true;
  compactTable = false;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.reloadDashboard();
  }

  get structureAdmins(): UserItem[] {
    return this.users.filter((user) => this.isStructureAdmin(user));
  }

  get filteredAdmins(): UserItem[] {
    const query = this.adminSearchTerm.trim().toLowerCase();
    return this.structureAdmins.filter((admin) => {
      if (this.adminFilter === 'ACTIVE' && !admin.is_active) {
        return false;
      }
      if (this.adminFilter === 'INACTIVE' && admin.is_active) {
        return false;
      }
      if (!this.showInactiveByDefault && this.adminFilter === 'ALL' && !admin.is_active) {
        return false;
      }
      if (!query) {
        return true;
      }
      const structureName = this.resolveStructureName(admin).toLowerCase();
      return (
        admin.username.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        structureName.includes(query)
      );
    });
  }

  get filteredStructures(): StructureItem[] {
    const query = this.structureSearchTerm.trim().toLowerCase();
    return this.structures.filter((structure) => {
      if (!this.showInactiveByDefault && !structure.is_active) {
        return false;
      }
      if (!query) {
        return true;
      }
      return structure.name.toLowerCase().includes(query);
    });
  }

  get totalAdmins(): number {
    return this.structureAdmins.length;
  }

  get activeAdmins(): number {
    return this.structureAdmins.filter((admin) => admin.is_active).length;
  }

  get inactiveAdmins(): number {
    return this.structureAdmins.filter((admin) => !admin.is_active).length;
  }

  get totalStructures(): number {
    return this.structures.length;
  }

  get structuresForSelectedType(): StructureItem[] {
    if (!this.adminDraft.structureType) {
      return this.structures;
    }
    return this.structures.filter((structure) => structure.type === this.adminDraft.structureType);
  }

  get userInitials(): string {
    const username = this.profileDraft.username.trim();
    if (username) {
      const chunks = username.split(/\s+/).filter(Boolean);
      if (chunks.length === 1) {
        return chunks[0].slice(0, 2).toUpperCase();
      }
      return `${chunks[0][0] ?? ''}${chunks[1][0] ?? ''}`.toUpperCase();
    }
    const email = this.profileDraft.email.trim();
    return email ? email.slice(0, 2).toUpperCase() : 'SA';
  }

  setActiveSection(section: SectionKey): void {
    this.activeSection = section;
  }

  onNavClick(section: SectionKey): void {
    this.setActiveSection(section);
  }

  isSectionActive(section: SectionKey): boolean {
    return this.activeSection === section;
  }

  applyDashboardCardAction(filter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'STRUCTURES'): void {
    if (filter === 'STRUCTURES') {
      this.activeSection = 'structures';
      return;
    }
    this.adminFilter = filter;
    this.activeSection = 'dashboard';
  }

  reloadDashboard(): void {
    this.isLoading = true;
    let pending = 3;
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

    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: () => {
        this.users = [];
        markDone();
      },
      complete: markDone
    });

    this.api.getMyProfile().subscribe({
      next: (profile) => {
        this.profileDraft = {
          username: profile.username ?? '',
          email: profile.email ?? '',
          profilePicture: null
        };
        this.profilePicturePreview = profile.profile_picture ?? '';
      },
      error: () => {
        this.profileMessage = 'Impossible de charger le profil Super Admin.';
        markDone();
      },
      complete: markDone
    });
  }

  openCreateAdminModal(): void {
    this.createAdminModalOpen = true;
    this.adminDraft = this.emptyAdminDraft();
  }

  closeCreateAdminModal(): void {
    this.createAdminModalOpen = false;
    this.adminDraft = this.emptyAdminDraft();
    this.isSavingAdmin = false;
  }

  createStructureAdmin(): void {
    const email = this.adminDraft.email.trim().toLowerCase();
    const username = this.adminDraft.name.trim();
    const password = this.adminDraft.password;
    const structureType = this.adminDraft.structureType;
    const structureName = this.adminDraft.structureName.trim();
    if (!email || !username || !password || !structureType || !structureName) {
      window.alert(
        'Nom, email, mot de passe, type de structure et nom de structure sont obligatoires.'
      );
      return;
    }

    const normalizedStructureName = structureName.toLowerCase();
    const matchingStructures = this.structuresForSelectedType.filter(
      (structure) => structure.name.trim().toLowerCase() === normalizedStructureName
    );

    if (matchingStructures.length === 0) {
      window.alert('La structure saisie est introuvable pour ce type.');
      return;
    }

    if (matchingStructures.length > 1) {
      window.alert('Plusieurs structures ont ce nom. Utilisez un nom plus precis.');
      return;
    }

    const structureId = matchingStructures[0].id;
    const payload: UserPayload = {
      username,
      email,
      role: 'ADMIN_STRUCTURE',
      structure_type: structureType,
      structure: structureId,
      password,
      is_active: true
    };

    this.isSavingAdmin = true;
    this.api.createUser(payload).subscribe({
      next: () => {
        this.closeCreateAdminModal();
        window.alert('Compte administrateur cree.');
        this.reloadDashboard();
      },
      error: (error: unknown) => {
        this.isSavingAdmin = false;
        window.alert(this.toErrorMessage(error, 'Creation de compte admin impossible.'));
      }
    });
  }

  openViewAdminModal(admin: UserItem): void {
    this.adminModalMode = 'view';
    this.selectedAdmin = admin;
    this.adminEditDraft = this.toAdminEditDraft(admin);
    this.adminModalOpen = true;
  }

  openEditAdminModal(admin: UserItem): void {
    this.adminModalMode = 'edit';
    this.selectedAdmin = admin;
    this.adminEditDraft = this.toAdminEditDraft(admin);
    this.adminModalOpen = true;
  }

  closeAdminModal(): void {
    this.adminModalOpen = false;
    this.adminModalMode = 'view';
    this.selectedAdmin = null;
    this.adminEditDraft = this.emptyAdminEditDraft();
  }

  saveAdminChanges(): void {
    if (this.adminModalMode !== 'edit' || !this.selectedAdmin) {
      this.closeAdminModal();
      return;
    }
    const email = this.adminEditDraft.email.trim().toLowerCase();
    const username = this.adminEditDraft.name.trim();
    if (!email || !username || this.adminEditDraft.structureId === null) {
      window.alert('Nom, email et structure sont obligatoires.');
      return;
    }

    this.isUpdatingAdminId = this.selectedAdmin.id;
    this.api
      .updateUser(this.selectedAdmin.id, {
        email,
        username,
        structure: this.adminEditDraft.structureId
      })
      .subscribe({
        next: () => {
          this.isUpdatingAdminId = null;
          this.closeAdminModal();
          this.reloadDashboard();
        },
        error: (error: unknown) => {
          this.isUpdatingAdminId = null;
          window.alert(this.toErrorMessage(error, 'Modification impossible.'));
        }
      });
  }

  toggleAdminStatus(admin: UserItem): void {
    if (this.isUpdatingAdminId !== null) {
      return;
    }
    const nextStatus = !admin.is_active;
    this.isUpdatingAdminId = admin.id;
    this.api.updateUser(admin.id, { is_active: nextStatus }).subscribe({
      next: () => {
        this.users = this.users.map((item) =>
          item.id === admin.id ? { ...item, is_active: nextStatus } : item
        );
        this.isUpdatingAdminId = null;
      },
      error: (error: unknown) => {
        this.isUpdatingAdminId = null;
        window.alert(this.toErrorMessage(error, 'Mise a jour du statut impossible.'));
      }
    });
  }

  removeAdmin(admin: UserItem): void {
    const confirmed = window.confirm(`Supprimer le compte de ${admin.username} ?`);
    if (!confirmed || this.isDeletingAdminId !== null) {
      return;
    }
    this.isDeletingAdminId = admin.id;
    this.api.deleteUser(admin.id).subscribe({
      next: () => {
        this.users = this.users.filter((item) => item.id !== admin.id);
        this.isDeletingAdminId = null;
      },
      error: (error: unknown) => {
        this.isDeletingAdminId = null;
        window.alert(this.toErrorMessage(error, 'Suppression impossible.'));
      }
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
    this.structureModalMode = 'create';
    this.structureDraft = this.emptyStructureDraft();
    this.isSavingStructure = false;
  }

  saveStructure(): void {
    if (this.structureModalMode === 'view') {
      this.closeStructureModal();
      return;
    }
    const name = this.structureDraft.name.trim();
    const city = this.structureDraft.city.trim();
    const addressLine = this.structureDraft.addressLine.trim();
    if (!name || !city || !addressLine) {
      window.alert('Nom, ville et adresse sont obligatoires.');
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
    this.pendingDeleteStructure = structure;
  }

  cancelDeleteStructure(): void {
    this.pendingDeleteStructure = null;
  }

  confirmDeleteStructure(): void {
    if (!this.pendingDeleteStructure) {
      return;
    }
    this.isDeletingStructure = true;
    const id = this.pendingDeleteStructure.id;
    this.api.deleteStructure(id).subscribe({
      next: () => {
        this.pendingDeleteStructure = null;
        this.isDeletingStructure = false;
        this.reloadDashboard();
      },
      error: (error: unknown) => {
        this.isDeletingStructure = false;
        window.alert(this.toErrorMessage(error, 'Suppression impossible.'));
      }
    });
  }

  resolveStructureName(admin: UserItem): string {
    if (admin.structure_name && admin.structure_name.trim()) {
      return admin.structure_name;
    }
    if (admin.structure === null) {
      return '-';
    }
    const structure = this.structures.find((item) => item.id === admin.structure);
    return structure ? structure.name : `Structure #${admin.structure}`;
  }

  resolveStructureCity(structure: StructureItem): string {
    const parts = structure.address
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (parts.length === 0) {
      return '-';
    }
    return parts[parts.length - 1];
  }

  onAdminStructureTypeChange(): void {
    this.adminDraft.structureName = '';
  }

  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.profileDraft.profilePicture = file;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.profilePicturePreview = reader.result;
      }
    };
    reader.readAsDataURL(file);
  }

  saveSuperAdminProfile(): void {
    const username = this.profileDraft.username.trim();
    const email = this.profileDraft.email.trim().toLowerCase();
    if (!username || !email) {
      this.profileMessage = 'Nom et email sont obligatoires.';
      return;
    }

    this.isSavingProfile = true;
    this.profileMessage = '';
    this.api
      .updateMyProfile({
        username,
        email,
        profile_picture: this.profileDraft.profilePicture ?? undefined
      })
      .subscribe({
        next: (profile) => {
          this.isSavingProfile = false;
          this.profileDraft = {
            username: profile.username ?? '',
            email: profile.email ?? '',
            profilePicture: null
          };
          if (profile.profile_picture) {
            this.profilePicturePreview = profile.profile_picture;
          }
          this.profileMessage = 'Profil mis à jour.';
        },
        error: (error: unknown) => {
          this.isSavingProfile = false;
          this.profileMessage = this.toErrorMessage(error, 'Mise à jour du profil impossible.');
        }
      });
  }

  adminStatusClass(isActive: boolean): string {
    return isActive ? 'status-pill status-active' : 'status-pill status-inactive';
  }

  adminStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  structureStatusClass(isActive: boolean): string {
    return isActive ? 'status-pill status-active' : 'status-pill status-inactive';
  }

  structureStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  trackByAdmin = (_: number, item: UserItem): number => item.id;
  trackByStructure = (_: number, item: StructureItem): number => item.id;

  private isStructureAdmin(user: UserItem): boolean {
    const normalizedRole = user.role.replace(/[\s-]/g, '_').toUpperCase();
    return normalizedRole === 'STRUCTURE_ADMIN' || normalizedRole === 'ADMIN_STRUCTURE';
  }

  private emptyAdminDraft(): AdminDraft {
    return {
      name: '',
      email: '',
      password: '',
      structureType: '',
      structureName: ''
    };
  }

  private emptyAdminEditDraft(): AdminEditDraft {
    return {
      id: null,
      name: '',
      email: '',
      structureId: null
    };
  }

  private toAdminEditDraft(admin: UserItem): AdminEditDraft {
    return {
      id: admin.id,
      name: admin.username,
      email: admin.email,
      structureId: admin.structure
    };
  }

  private emptyProfileDraft(): SuperAdminProfileDraft {
    return {
      username: '',
      email: '',
      profilePicture: null
    };
  }

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
