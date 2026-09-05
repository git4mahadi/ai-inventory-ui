import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { PurchaseOrderCreateComponent } from './purchase-order-create/purchase-order-create.component';
import { PurchaseOrderEditComponent } from './purchase-order-edit/purchase-order-edit.component';
import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: PurchaseOrderListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.purchaseOrderList },
  },
  {
    path: 'create',
    component: PurchaseOrderCreateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.purchaseOrderCreate },
  },
  {
    path: 'edit/:id',
    component: PurchaseOrderEditComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.purchaseOrderEdit },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PurchaseOrdersRoutingModule {}
