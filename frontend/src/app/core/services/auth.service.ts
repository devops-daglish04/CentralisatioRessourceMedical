import { Injectable } from '@angular/core';

type JwtPayload = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'access_token';
  private readonly refreshTokenKey = 'refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(this.accessTokenKey, access);
    localStorage.setItem(this.refreshTokenKey, refresh);
  }

  clearTokens(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) {
      return false;
    }
    const payload = this.decodePayload(token);
    if (!payload) {
      return false;
    }
    const exp = payload['exp'];
    if (typeof exp !== 'number') {
      return true;
    }
    return Date.now() < exp * 1000;
  }

  hasRole(role: string): boolean {
    const token = this.getAccessToken();
    const payload = token ? this.decodePayload(token) : null;
    if (!payload) {
      return false;
    }
    const roleValue = payload['role'] ?? payload['user_role'];
    if (role === 'ADMIN_STRUCTURE') {
      return roleValue === 'ADMIN_STRUCTURE' || roleValue === 'STRUCTURE_ADMIN';
    }
    return roleValue === role;
  }

  getRole(): string | null {
    const token = this.getAccessToken();
    const payload = token ? this.decodePayload(token) : null;
    if (!payload) {
      return null;
    }
    const roleValue = payload['role'] ?? payload['user_role'];
    return typeof roleValue === 'string' ? roleValue : null;
  }

  getStructureId(): number | null {
    const token = this.getAccessToken();
    const payload = token ? this.decodePayload(token) : null;
    if (!payload) {
      return null;
    }
    const structureId = payload['structure_id'];
    if (typeof structureId === 'number') {
      return structureId;
    }
    return null;
  }

  private decodePayload(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const json = atob(padded);
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }
}
