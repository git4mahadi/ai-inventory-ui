import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreCreateComponent } from './store-create/store-create.component';
import { StoreEditComponent } from './store-edit/store-edit.component';
import { StoreListComponent } from './store-list/store-list.component';

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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StoresRoutingModule {}
