import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReconcileStockCreateComponent } from './reconcile-stock-create/reconcile-stock-create.component';
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
  },
  {
    path: 'create',
    component: ReconcileStockCreateComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReconcileStocksRoutingModule {}
