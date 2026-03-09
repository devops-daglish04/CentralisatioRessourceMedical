import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
    canActivate: [authGuard]
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./results/search-results.component').then((m) => m.SearchResultsComponent)
  },
  {
    path: 'structure/:id',
    loadComponent: () =>
      import('./structure-details/structure-details.component').then(
        (m) => m.StructureDetailsComponent
      )
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
