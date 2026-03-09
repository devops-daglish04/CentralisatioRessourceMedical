import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ApiService,
  CreateStructureAdminPayload,
  StructureItem,
  UserItem,
} from '../../../core/services/api.service';

type SectionKey = 'structures' | 'admins';
type AdminModalMode = 'view' | 'edit';

interface CreateAdminDraft {
  admin_name: string;
  email: string;
  password: string;
  is_active: boolean;
  structure_name: string;
  structure_type: 'Hopital' | 'Clinique' | 'Pharmacie' | 'Banque';
  city: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface AdminEditDraft {
  id: number | null;
  name: string;
  email: string;
  structureId: number | null;
  isActive: boolean;
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
  activeSection: SectionKey = 'admins';
  isLoading = true;
  message = '';

  adminSearchTerm = '';
  structureSearchTerm = '';

  createAdminModalOpen = false;
  adminModalOpen = false;
  adminModalMode: AdminModalMode = 'view';
  selectedAdmin: UserItem | null = null;

  isSavingAdmin = false;
  isUpdatingAdminId: number | null = null;
  isDeletingAdminId: number | null = null;

  createDraft: CreateAdminDraft = this.emptyCreateDraft();
  adminEditDraft: AdminEditDraft = this.emptyEditDraft();

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
      if (!query) {
        return true;
      }
      const displayName = this.displayAdminName(admin).toLowerCase();
      return (
        displayName.includes(query) ||
        admin.email.toLowerCase().includes(query) ||
        this.resolveStructureName(admin).toLowerCase().includes(query)
      );
    });
  }

  get filteredStructures(): StructureItem[] {
    const query = this.structureSearchTerm.trim().toLowerCase();
    return this.structures.filter((structure) => {
      if (!query) {
        return true;
      }
      return (
        structure.name.toLowerCase().includes(query) ||
        structure.type.toLowerCase().includes(query) ||
        this.resolveStructureCity(structure).toLowerCase().includes(query)
      );
    });
  }

  reloadDashboard(): void {
    this.isLoading = true;
    this.message = '';
    let pending = 2;
    const done = () => {
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
        this.message = 'Impossible de charger les structures.';
        done();
      },
      complete: done
    });

    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: () => {
        this.users = [];
        this.message = 'Impossible de charger les administrateurs.';
        done();
      },
      complete: done
    });
  }

  setActiveSection(section: SectionKey): void {
    this.activeSection = section;
  }

  isSectionActive(section: SectionKey): boolean {
    return this.activeSection === section;
  }

  openCreateAdminModal(): void {
    this.createAdminModalOpen = true;
    this.createDraft = this.emptyCreateDraft();
  }

  closeCreateAdminModal(): void {
    this.createAdminModalOpen = false;
    this.isSavingAdmin = false;
    this.createDraft = this.emptyCreateDraft();
  }

  createStructureAdmin(): void {
    if (!this.isCreateDraftValid()) {
      this.message = 'Tous les champs requis doivent être renseignés.';
      return;
    }

    this.isSavingAdmin = true;
    this.message = '';
    const payload: CreateStructureAdminPayload = {
      ...this.createDraft,
      admin_name: this.createDraft.admin_name.trim(),
      email: this.createDraft.email.trim().toLowerCase(),
      structure_name: this.createDraft.structure_name.trim(),
      city: this.createDraft.city.trim(),
      address: this.createDraft.address.trim(),
      phone: this.createDraft.phone.trim(),
    };

    this.api.createStructureAdmin(payload).subscribe({
      next: () => {
        this.closeCreateAdminModal();
        this.reloadDashboard();
        this.activeSection = 'admins';
      },
      error: (error: unknown) => {
        this.isSavingAdmin = false;
        this.message = this.toErrorMessage(error, 'Création admin impossible.');
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
    this.adminEditDraft = this.emptyEditDraft();
    this.isUpdatingAdminId = null;
  }

  saveAdminChanges(): void {
    if (this.adminModalMode !== 'edit' || !this.selectedAdmin) {
      return;
    }
    if (
      !this.adminEditDraft.name.trim() ||
      !this.adminEditDraft.email.trim() ||
      this.adminEditDraft.structureId === null
    ) {
      this.message = 'Nom, email et structure sont requis.';
      return;
    }

    this.isUpdatingAdminId = this.selectedAdmin.id;
    this.api
      .updateUser(this.selectedAdmin.id, {
        first_name: this.adminEditDraft.name.trim(),
        email: this.adminEditDraft.email.trim().toLowerCase(),
        structure: this.adminEditDraft.structureId,
        is_active: this.adminEditDraft.isActive,
      })
      .subscribe({
        next: () => {
          this.isUpdatingAdminId = null;
          this.closeAdminModal();
          this.reloadDashboard();
        },
        error: (error: unknown) => {
          this.isUpdatingAdminId = null;
          this.message = this.toErrorMessage(error, 'Modification impossible.');
        }
      });
  }

  removeAdmin(admin: UserItem): void {
    const confirmed = window.confirm(`Supprimer le compte de ${this.displayAdminName(admin)} ?`);
    if (!confirmed) {
      return;
    }
    this.isDeletingAdminId = admin.id;
    this.api.deleteUser(admin.id).subscribe({
      next: () => {
        this.isDeletingAdminId = null;
        this.users = this.users.filter((item) => item.id !== admin.id);
      },
      error: (error: unknown) => {
        this.isDeletingAdminId = null;
        this.message = this.toErrorMessage(error, 'Suppression impossible.');
      }
    });
  }

  displayAdminName(admin: UserItem): string {
    return (admin.first_name || '').trim() || admin.username;
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

  adminStatusLabel(isActive: boolean): string {
    return isActive ? 'Actif' : 'Inactif';
  }

  adminStatusClass(isActive: boolean): string {
    return isActive ? 'status-pill status-active' : 'status-pill status-inactive';
  }

  trackByAdmin = (_: number, item: UserItem): number => item.id;
  trackByStructure = (_: number, item: StructureItem): number => item.id;

  private isStructureAdmin(user: UserItem): boolean {
    const normalizedRole = user.role.replace(/[\s-]/g, '_').toUpperCase();
    return normalizedRole === 'ADMIN_STRUCTURE' || normalizedRole === 'STRUCTURE_ADMIN';
  }

  private emptyCreateDraft(): CreateAdminDraft {
    return {
      admin_name: '',
      email: '',
      password: '',
      is_active: true,
      structure_name: '',
      structure_type: 'Hopital',
      city: 'Yaounde',
      address: '',
      phone: '',
      latitude: 3.8667,
      longitude: 11.5167,
    };
  }

  private emptyEditDraft(): AdminEditDraft {
    return {
      id: null,
      name: '',
      email: '',
      structureId: null,
      isActive: true,
    };
  }

  private toAdminEditDraft(admin: UserItem): AdminEditDraft {
    return {
      id: admin.id,
      name: this.displayAdminName(admin),
      email: admin.email,
      structureId: admin.structure,
      isActive: admin.is_active,
    };
  }

  private isCreateDraftValid(): boolean {
    return Boolean(
      this.createDraft.admin_name.trim() &&
        this.createDraft.email.trim() &&
        this.createDraft.password &&
        this.createDraft.structure_name.trim() &&
        this.createDraft.city.trim() &&
        this.createDraft.address.trim()
    );
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
