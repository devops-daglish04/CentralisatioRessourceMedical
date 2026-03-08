import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SearchResultsComponent } from './results/search-results.component';
import { StructureDetailsComponent } from './structure-details/structure-details.component';

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'results',
    component: SearchResultsComponent
  },
  {
    path: 'structure/:id',
    component: StructureDetailsComponent
  }
];


