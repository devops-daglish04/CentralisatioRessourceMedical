import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'public'
  },
  {
    path: 'public',
    loadChildren: () =>
      import('./features/public/public.routes').then((m) => m.PUBLIC_ROUTES)
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin-structure/admin-structure.routes').then(
        (m) => m.ADMIN_STRUCTURE_ROUTES
      )
  },
  {
    path: 'structure-admin',
    loadChildren: () =>
      import('./features/admin-structure/admin-structure.routes').then(
        (m) => m.STRUCTURE_ADMIN_ROUTES
      )
  },
  {
    path: 'super-admin',
    loadChildren: () =>
      import('./features/super-admin/super-admin.routes').then(
        (m) => m.SUPER_ADMIN_ROUTES
      )
  },
  {
    path: '**',
    redirectTo: 'public'
  }
];
