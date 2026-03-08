import { Routes } from '@angular/router';
import { SuperAdminStructuresPageComponent } from './structures/super-admin-structures-page.component';
import { superAdminRoleGuard } from '../../core/guards/super-admin-role.guard';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'dashboard',
    component: SuperAdminStructuresPageComponent,
    canActivate: [superAdminRoleGuard]
  }
];


