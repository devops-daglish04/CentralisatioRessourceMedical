import { Routes } from '@angular/router';
import { AdminLoginComponent } from './auth/admin-login.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminResourcesPageComponent } from './resources/admin-resources-page.component';
import { adminRoleGuard } from '../../core/guards/admin-role.guard';

export const ADMIN_STRUCTURE_ROUTES: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminRoleGuard],
    children: [
      {
        path: '',
        redirectTo: 'resources',
        pathMatch: 'full'
      },
      {
        path: 'resources',
        component: AdminResourcesPageComponent
      }
    ]
  }
];


