import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { SalesCreateComponent } from './sales-create/sales-create.component';
import { SalesEditComponent } from './sales-edit/sales-edit.component';
import { SalesListComponent } from './sales-list/sales-list.component';
import { SalesSlipComponent } from './sales-slip/sales-slip.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';
import { DueCollectionComponent } from './due-collection/due-collection.component';
import { SalesReturnComponent } from './sales-return/sales-return.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: SalesListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.salesList },
  },
  {
    path: 'create',
    component: SalesCreateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.salesCreate },
  },
  {
    path: 'edit/:id',
    component: SalesEditComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.salesEdit },
  },
  {
    path: 'slip/:id',
    component: SalesSlipComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.salesList },
  },
  {
    path: 'invoices',
    component: InvoiceListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.invoice },
  },
  {
    path: 'due-collection',
    component: DueCollectionComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.dueCollection },
  },
  {
    path: 'sales-return',
    component: SalesReturnComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.salesReturn },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
