import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { CustomerListComponent } from './customer-list/customer-list.component';
import { CustomersRoutingModule } from './customers-routing.module';

@NgModule({
  declarations: [CustomerListComponent],
  imports: [SharedModule, CustomersRoutingModule, AgGridAngular],
})
export class CustomersModule {}
