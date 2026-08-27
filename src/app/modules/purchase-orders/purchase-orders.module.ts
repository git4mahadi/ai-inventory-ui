import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { PurchaseOrderCreateComponent } from './purchase-order-create/purchase-order-create.component';
import { PurchaseOrderEditComponent } from './purchase-order-edit/purchase-order-edit.component';
import { PurchaseOrderListComponent } from './purchase-order-list/purchase-order-list.component';
import { PurchaseOrdersRoutingModule } from './purchase-orders-routing.module';

@NgModule({
  declarations: [
    PurchaseOrderListComponent,
    PurchaseOrderCreateComponent,
    PurchaseOrderEditComponent,
  ],
  imports: [SharedModule, PurchaseOrdersRoutingModule, AgGridAngular],
})
export class PurchaseOrdersModule {}
