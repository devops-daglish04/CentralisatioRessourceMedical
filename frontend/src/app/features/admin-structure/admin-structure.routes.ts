import { Routes } from '@angular/router';
import { AdminLoginComponent } from './auth/admin-login.component';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { AdminResourcesPageComponent } from './resources/admin-resources-page.component';
import { AdminStructureProfilePageComponent } from './profile/admin-structure-profile-page.component';
import { AdminServicesPageComponent } from './services/admin-services-page.component';
import { AdminHistoryPageComponent } from './history/admin-history-page.component';
import { adminRoleGuard } from '../../core/guards/admin-role.guard';

const STRUCTURE_ADMIN_CHILDREN: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: AdminResourcesPageComponent
  },
  {
    path: 'resources',
    component: AdminResourcesPageComponent
  },
  {
    path: 'profile',
    component: AdminStructureProfilePageComponent
  },
  {
    path: 'services',
    component: AdminServicesPageComponent
  },
  {
    path: 'history',
    component: AdminHistoryPageComponent
  }
];

export const ADMIN_STRUCTURE_ROUTES: Routes = [
  {
    path: 'login',
    component: AdminLoginComponent
  },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminRoleGuard],
    children: STRUCTURE_ADMIN_CHILDREN
  }
];

export const STRUCTURE_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminRoleGuard],
    children: STRUCTURE_ADMIN_CHILDREN
  }
];


