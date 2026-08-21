import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SupplierCreateComponent } from './supplier-create/supplier-create.component';
import { SupplierEditComponent } from './supplier-edit/supplier-edit.component';
import { SupplierListComponent } from './supplier-list/supplier-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: SupplierListComponent,
  },
  {
    path: 'create',
    component: SupplierCreateComponent,
  },
  {
    path: 'edit/:id',
    component: SupplierEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SuppliersRoutingModule {}
