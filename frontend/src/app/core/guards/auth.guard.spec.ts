import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let isAuthenticated = false;
  let roleSet = new Set<string>();

  const router = {
    createUrlTree: (commands: string[]) => ({ commands })
  };
  const auth = {
    isAuthenticated: () => isAuthenticated,
    hasRole: (role: string) => roleSet.has(role)
  };

  beforeEach(() => {
    isAuthenticated = false;
    roleSet = new Set<string>();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth }
      ]
    });
  });

  it('allows guest users', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toBe(true);
  });

  it('redirects super admin users', () => {
    isAuthenticated = true;
    roleSet = new Set<string>(['SUPER_ADMIN']);
    const result = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(result).toEqual({ commands: ['/super-admin/dashboard'] });
  });
});
