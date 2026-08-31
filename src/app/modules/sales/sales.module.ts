import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { SalesCreateComponent } from './sales-create/sales-create.component';
import { SalesEditComponent } from './sales-edit/sales-edit.component';
import { SalesListComponent } from './sales-list/sales-list.component';
import { SalesSlipComponent } from './sales-slip/sales-slip.component';
import { InvoiceListComponent } from './invoice-list/invoice-list.component';
import { SalesRoutingModule } from './sales-routing.module';

@NgModule({
  declarations: [
    SalesListComponent,
    SalesCreateComponent,
    SalesEditComponent,
    SalesSlipComponent,
    InvoiceListComponent,
  ],
  imports: [SharedModule, SalesRoutingModule, AgGridAngular],
})
export class SalesModule {}
