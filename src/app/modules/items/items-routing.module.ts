import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
import { ItemBarcodeGenerateComponent } from './item-barcode-generate/item-barcode-generate.component';
import { ItemListComponent } from './item-list/item-list.component';

const routes: Routes = [
  {
    path: 'barcode-generate',
    component: ItemBarcodeGenerateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.barcodeGenerate },
  },
  {
    path: 'edit/:id',
    component: ItemListComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.item },
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
    component: ItemListComponent,
    pathMatch: 'full',
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.item },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ItemsRoutingModule {}
