import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const defaultRouteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/public/home']);
  }

  if (auth.hasRole('SUPER_ADMIN')) {
    return router.createUrlTree(['/super-admin/dashboard']);
  }

  if (auth.hasRole('ADMIN_STRUCTURE') || auth.hasRole('STRUCTURE_ADMIN')) {
    return router.createUrlTree(['/structure-admin/dashboard']);
  }

  return router.createUrlTree(['/public/home']);
};
