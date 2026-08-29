import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesCreateComponent } from './sales-create/sales-create.component';
import { SalesEditComponent } from './sales-edit/sales-edit.component';
import { SalesListComponent } from './sales-list/sales-list.component';
import { SalesSlipComponent } from './sales-slip/sales-slip.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: SalesListComponent,
  },
  {
    path: 'create',
    component: SalesCreateComponent,
  },
  {
    path: 'edit/:id',
    component: SalesEditComponent,
  },
  {
    path: 'slip/:id',
    component: SalesSlipComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
