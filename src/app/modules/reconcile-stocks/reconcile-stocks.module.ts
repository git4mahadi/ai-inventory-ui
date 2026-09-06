import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { ReconcileStockCreateComponent } from './reconcile-stock-create/reconcile-stock-create.component';
import { ReconcileStockEditComponent } from './reconcile-stock-edit/reconcile-stock-edit.component';
import { ReconcileStockListComponent } from './reconcile-stock-list/reconcile-stock-list.component';
import { ReconcileStockViewDialogComponent } from './reconcile-stock-view-dialog/reconcile-stock-view-dialog.component';
import { ReconcileStocksRoutingModule } from './reconcile-stocks-routing.module';

@NgModule({
  declarations: [
    ReconcileStockListComponent,
    ReconcileStockCreateComponent,
    ReconcileStockEditComponent,
    ReconcileStockViewDialogComponent,
  ],
  imports: [SharedModule, ReconcileStocksRoutingModule, AgGridAngular],
})
export class ReconcileStocksModule {}
