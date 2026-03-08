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
}

export interface GeoPoint {
  type: string;
  coordinates: [number, number];
}

export interface ResourceItem {
  id: number;
  structure: number;
  resource_type: string;
  name_or_group: string;
  quantity: number;
  unit: string;
  status: string;
  last_updated: string;
}

export interface CreateResourcePayload {
  resource_type: string;
  name_or_group: string;
  quantity: number;
  unit: string;
  status: string;
  structure?: number;
}

export interface StructureItem {
  id: number;
  name: string;
  type: string;
  address: string;
  contact_phone: string;
  is_active: boolean;
  location: GeoPoint | string | null;
}

export interface StructurePayload {
  name: string;
  type: string;
  address: string;
  contact_phone: string;
  is_active: boolean;
  location: GeoPoint;
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
  is_active: boolean;
}

export interface UserPayload {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  structure?: number | null;
  password: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  searchStructures(
    lat: number,
    lng: number,
    options?: {
      radiusKm?: number;
      limit?: number;
      includeResources?: boolean;
      includeServices?: boolean;
    }
  ): Observable<StructureSearchResult[]> {
    const params: Record<string, string> = {
      lat: lat.toString(),
      lng: lng.toString()
    };
    if (options?.radiusKm) {
      params['radius_km'] = options.radiusKm.toString();
    }
    if (options?.limit) {
      params['limit'] = options.limit.toString();
    }
    if (options?.includeResources !== undefined) {
      params['include_resources'] = options.includeResources ? '1' : '0';
    }
    if (options?.includeServices !== undefined) {
      params['include_services'] = options.includeServices ? '1' : '0';
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

  getStructures(): Observable<StructureItem[]> {
    return this.http.get<StructureItem[]>(`${this.baseUrl}/structures/`);
  }

  createStructure(payload: StructurePayload): Observable<StructureItem> {
    return this.http.post<StructureItem>(`${this.baseUrl}/structures/`, payload);
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

  getUsers(): Observable<UserItem[]> {
    return this.http.get<UserItem[]>(`${this.baseUrl}/users/`);
  }

  createUser(payload: UserPayload): Observable<UserItem> {
    return this.http.post<UserItem>(`${this.baseUrl}/users/`, payload);
  }

  updateUser(id: number, payload: Partial<UserPayload>): Observable<UserItem> {
    return this.http.patch<UserItem>(`${this.baseUrl}/users/${id}/`, payload);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}/`);
  }
}


