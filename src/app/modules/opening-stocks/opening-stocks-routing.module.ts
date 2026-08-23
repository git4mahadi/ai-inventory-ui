import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
  },
  {
    path: 'create',
    component: OpeningStockCreateComponent,
  },
  {
    path: 'edit/:id',
    component: OpeningStockEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OpeningStocksRoutingModule {}
