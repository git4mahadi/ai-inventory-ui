import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CustomerListComponent } from './customer-list/customer-list.component';

const routes: Routes = [
  {
    path: 'edit/:id',
    component: CustomerListComponent,
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
    component: CustomerListComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CustomersRoutingModule {}
