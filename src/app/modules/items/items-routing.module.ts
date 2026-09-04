import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ItemBarcodeGenerateComponent } from './item-barcode-generate/item-barcode-generate.component';
import { ItemListComponent } from './item-list/item-list.component';

const routes: Routes = [
  {
    path: 'barcode-generate',
    component: ItemBarcodeGenerateComponent,
  },
  {
    path: 'edit/:id',
    component: ItemListComponent,
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
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ItemsRoutingModule {}
