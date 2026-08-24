import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreCreateComponent } from './store-create/store-create.component';
import { StoreEditComponent } from './store-edit/store-edit.component';
import { StoreListComponent } from './store-list/store-list.component';
import { StockListComponent } from './stock-list/stock-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: StoreListComponent,
  },
  {
    path: 'create',
    component: StoreCreateComponent,
  },
  {
    path: 'edit/:id',
    component: StoreEditComponent,
  },
  {
    path: 'stock',
    component: StockListComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StoresRoutingModule {}
