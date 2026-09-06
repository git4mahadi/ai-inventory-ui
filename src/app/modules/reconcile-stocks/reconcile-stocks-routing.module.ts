import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { ReconcileStockCreateComponent } from './reconcile-stock-create/reconcile-stock-create.component';
import { ReconcileStockEditComponent } from './reconcile-stock-edit/reconcile-stock-edit.component';
import { ReconcileStockListComponent } from './reconcile-stock-list/reconcile-stock-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: ReconcileStockListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.reconcileStockList },
  },
  {
    path: 'create',
    component: ReconcileStockCreateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.reconcileStockCreate },
  },
  {
    path: 'edit/:id',
    component: ReconcileStockEditComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.reconcileStockEdit },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReconcileStocksRoutingModule {}
