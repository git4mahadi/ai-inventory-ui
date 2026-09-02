import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ItemBarcodeGenerateComponent } from './item-barcode-generate/item-barcode-generate.component';
import { ItemCreateComponent } from './item-create/item-create.component';
import { ItemEditComponent } from './item-edit/item-edit.component';
import { ItemListComponent } from './item-list/item-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: ItemListComponent,
  },
  {
    path: 'create',
    component: ItemCreateComponent,
  },
  {
    path: 'barcode-generate',
    component: ItemBarcodeGenerateComponent,
  },
  {
    path: 'edit/:id',
    component: ItemEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ItemsRoutingModule {}
