import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinancialYearCreateComponent } from './financial-year-create/financial-year-create.component';
import { FinancialYearEditComponent } from './financial-year-edit/financial-year-edit.component';
import { FinancialYearListComponent } from './financial-year-list/financial-year-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: FinancialYearListComponent,
  },
  {
    path: 'create',
    component: FinancialYearCreateComponent,
  },
  {
    path: 'edit/:id',
    component: FinancialYearEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FinancialYearsRoutingModule {}
