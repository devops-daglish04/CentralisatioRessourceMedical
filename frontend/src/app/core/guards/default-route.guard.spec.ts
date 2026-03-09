import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { defaultRouteGuard } from './default-route.guard';
import { AuthService } from '../services/auth.service';

describe('defaultRouteGuard', () => {
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

  it('redirects unauthenticated users to public home', () => {
    const result = TestBed.runInInjectionContext(() =>
      defaultRouteGuard({} as never, {} as never)
    );
    expect(result).toEqual({ commands: ['/public/home'] });
  });

  it('redirects structure admin users to structure dashboard', () => {
    isAuthenticated = true;
    roleSet = new Set<string>(['ADMIN_STRUCTURE']);
    const result = TestBed.runInInjectionContext(() =>
      defaultRouteGuard({} as never, {} as never)
    );
    expect(result).toEqual({ commands: ['/structure-admin/dashboard'] });
  });
});
