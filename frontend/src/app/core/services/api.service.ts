import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StructureSearchResult {
  id: number;
  name: string;
  type: string;
  address: string;
  contact_phone: string;
  is_active: boolean;
  availability: boolean;
  blood_groups: string[];
  latitude: number;
  longitude: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
  distance_m: number;
  distance: number;
  resources: Array<{
    id: number;
    resource_type: string;
    name_or_group: string;
    quantity: number;
    unit: string;
    status: string;
    last_updated: string;
  }>;
  services: Array<{
    id: number;
    name: string;
    diseases: Array<{
      id: number;
      name: string;
    }>;
  }>;
}

export interface TokenResponse {
  access: string;
  refresh: string;
  role?: string;
  structure_id?: number | null;
  user_id?: number;
}

export interface GeoPoint {
  type: string;
  coordinates: [number, number];
}

export interface DiseaseItem {
  id: number;
  name: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  diseases: DiseaseItem[];
}

export interface ResourceItem {
  id: number;
  structure: number;
  resource_type: string;
  name_or_group: string;
  quantity: number;
  unit: string;
  status: string;
  blood_group?: string;
  availability?: boolean;
  last_updated: string;
}

export interface CreateResourcePayload {
  resource_type: string;
  name_or_group: string;
  quantity: number;
  unit: string;
  status: string;
  blood_group?: string;
  structure?: number;
}

export interface StructureItem {
  id: number;
  name: string;
  type: string;
  address: string;
  contact_phone: string;
  is_active: boolean;
  created_at?: string;
  location: GeoPoint | string | null;
  services?: ServiceItem[];
}

export interface StructurePayload {
  name: string;
  type: string;
  address: string;
  contact_phone: string;
  is_active: boolean;
  location: GeoPoint;
  service_ids?: number[];
}

export interface SearchStructuresParams {
  query?: string;
  type?: string;
  resource?: string;
  bloodGroup?: string;
  availability?: boolean;
  radius?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  limit?: number;
  includeResources?: boolean;
  includeServices?: boolean;
}

export interface AuditLogItem {
  id: number;
  timestamp: string;
  action: string;
  user: number | null;
  user_email?: string;
  structure: number | null;
  structure_name?: string;
  resource: number | null;
  resource_display?: string;
  metadata: unknown;
}

export interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  structure: number | null;
  structure_name?: string;
  profile_picture?: string | null;
  is_active: boolean;
}

export interface UserPayload {
  username: string;
  email: string;
  structure_type?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  structure?: number | null;
  password: string;
  is_active?: boolean;
}

export interface CreateStructureAdminPayload {
  admin_name: string;
  email: string;
  password: string;
  is_active: boolean;
  structure_name: string;
  structure_type: string;
  city: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface UserProfilePayload {
  username?: string;
  email?: string;
  profile_picture?: File;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  searchStructures(paramsInput: SearchStructuresParams): Observable<StructureSearchResult[]> {
    const params: Record<string, string> = {};
    if (paramsInput.query) {
      params['query'] = paramsInput.query;
    }
    if (paramsInput.resource) {
      params['resource'] = paramsInput.resource;
    }
    if (paramsInput.type) {
      params['type'] = paramsInput.type;
    }
    if (paramsInput.bloodGroup) {
      params['blood_group'] = paramsInput.bloodGroup;
    }
    if (paramsInput.availability !== undefined) {
      params['availability'] = paramsInput.availability ? '1' : '0';
    }
    if (paramsInput.radius !== undefined) {
      params['radius'] = paramsInput.radius.toString();
    }
    if (paramsInput.latitude !== undefined) {
      params['latitude'] = paramsInput.latitude.toString();
    }
    if (paramsInput.longitude !== undefined) {
      params['longitude'] = paramsInput.longitude.toString();
    }
    if (paramsInput.city) {
      params['city'] = paramsInput.city;
    }
    if (paramsInput.limit !== undefined) {
      params['limit'] = paramsInput.limit.toString();
    }
    if (paramsInput.includeResources !== undefined) {
      params['include_resources'] = paramsInput.includeResources ? '1' : '0';
    }
    if (paramsInput.includeServices !== undefined) {
      params['include_services'] = paramsInput.includeServices ? '1' : '0';
    }
    return this.http.get<StructureSearchResult[]>(`${this.baseUrl}/search/`, {
      params
    });
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/token/`, {
      email,
      password
    });
  }

  getResources(): Observable<ResourceItem[]> {
    return this.http.get<ResourceItem[]>(`${this.baseUrl}/resources/`);
  }

  createResource(payload: CreateResourcePayload): Observable<ResourceItem> {
    return this.http.post<ResourceItem>(`${this.baseUrl}/resources/`, payload);
  }

  updateResource(id: number, payload: Partial<CreateResourcePayload>): Observable<ResourceItem> {
    return this.http.patch<ResourceItem>(`${this.baseUrl}/resources/${id}/`, payload);
  }

  deleteResource(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/resources/${id}/`);
  }

  getStructures(): Observable<StructureItem[]> {
    return this.http.get<StructureItem[]>(`${this.baseUrl}/structures/`);
  }

  getServices(): Observable<ServiceItem[]> {
    return this.http.get<ServiceItem[]>(`${this.baseUrl}/services/`);
  }

  getStructure(id: number): Observable<StructureItem> {
    return this.http.get<StructureItem>(`${this.baseUrl}/structures/${id}/`);
  }

  getMyStructure(): Observable<StructureItem> {
    return this.http.get<StructureItem>(`${this.baseUrl}/structures/me/`);
  }

  createStructure(payload: StructurePayload): Observable<StructureItem> {
    return this.http.post<StructureItem>(`${this.baseUrl}/structures/`, payload);
  }

  updateMyStructure(payload: Partial<StructurePayload>): Observable<StructureItem> {
    return this.http.patch<StructureItem>(`${this.baseUrl}/structures/me/`, payload);
  }

  updateStructure(id: number, payload: StructurePayload): Observable<StructureItem> {
    return this.http.put<StructureItem>(`${this.baseUrl}/structures/${id}/`, payload);
  }

  deleteStructure(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/structures/${id}/`);
  }

  getAuditLogs(params?: {
    action?: string;
    user_id?: number;
    structure_id?: number;
    resource_id?: number;
  }): Observable<AuditLogItem[]> {
    return this.http.get<AuditLogItem[]>(`${this.baseUrl}/audit-logs/`, {
      params: params as Record<string, string | number | boolean> | undefined
    });
  }

  getUsers(role?: string): Observable<UserItem[]> {
    const params = role ? { role } : undefined;
    return this.http.get<UserItem[]>(`${this.baseUrl}/users/`, { params });
  }

  createUser(payload: UserPayload): Observable<UserItem> {
    return this.http.post<UserItem>(`${this.baseUrl}/users/`, payload);
  }

  createStructureAdmin(payload: CreateStructureAdminPayload): Observable<{
    user: UserItem;
    structure: StructureItem;
  }> {
    return this.http.post<{
      user: UserItem;
      structure: StructureItem;
    }>(`${this.baseUrl}/users/create-structure-admin/`, payload);
  }

  updateUser(id: number, payload: Partial<UserPayload>): Observable<UserItem> {
    return this.http.patch<UserItem>(`${this.baseUrl}/users/${id}/`, payload);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}/`);
  }

  getMyProfile(): Observable<UserItem> {
    return this.http.get<UserItem>(`${this.baseUrl}/users/me/`);
  }

  updateMyProfile(payload: UserProfilePayload): Observable<UserItem> {
    const formData = new FormData();
    if (payload.username !== undefined) {
      formData.append('username', payload.username);
    }
    if (payload.email !== undefined) {
      formData.append('email', payload.email);
    }
    if (payload.profile_picture) {
      formData.append('profile_picture', payload.profile_picture);
    }
    return this.http.patch<UserItem>(`${this.baseUrl}/users/me/`, formData);
  }
}


