import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminRoleGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/public/login']);
  }

  if (auth.hasRole('SUPER_ADMIN')) {
    return true;
  }

  if (auth.hasRole('ADMIN_STRUCTURE') || auth.hasRole('STRUCTURE_ADMIN')) {
    return router.createUrlTree(['/structure-admin/dashboard']);
  }

  return router.createUrlTree(['/public/login']);
};
