import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesCreateComponent } from './components/sales-create/sales-create.component';
import { SalesListComponent } from './components/sales-list/sales-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: SalesListComponent,
  },
  {
    path: 'create',
    component: SalesCreateComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalesRoutingModule {}
