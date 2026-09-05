import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { OpeningStockCreateComponent } from './opening-stock-create/opening-stock-create.component';
import { OpeningStockEditComponent } from './opening-stock-edit/opening-stock-edit.component';
import { OpeningStockListComponent } from './opening-stock-list/opening-stock-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: OpeningStockListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.openingStockList },
  },
  {
    path: 'create',
    component: OpeningStockCreateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.openingStockCreate },
  },
  {
    path: 'edit/:id',
    component: OpeningStockEditComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.openingStockEdit },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OpeningStocksRoutingModule {}
