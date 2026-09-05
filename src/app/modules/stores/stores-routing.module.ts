import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { StoreListComponent } from './store-list/store-list.component';
import { StockListComponent } from './stock-list/stock-list.component';

const routes: Routes = [
  {
    path: 'stock',
    component: StockListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.stock },
  },
  {
    path: 'edit/:id',
    component: StoreListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.store },
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
    component: StoreListComponent,
    pathMatch: 'full',
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.store },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StoresRoutingModule {}
