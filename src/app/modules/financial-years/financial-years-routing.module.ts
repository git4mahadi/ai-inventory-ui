import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinancialYearListComponent } from './financial-year-list/financial-year-list.component';

const routes: Routes = [
  {
    path: 'edit/:id',
    component: FinancialYearListComponent,
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'create',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    component: FinancialYearListComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinancialYearsRoutingModule {}
