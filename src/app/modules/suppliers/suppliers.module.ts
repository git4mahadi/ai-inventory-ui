import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { SupplierListComponent } from './supplier-list/supplier-list.component';
import { SuppliersRoutingModule } from './suppliers-routing.module';

@NgModule({
  declarations: [SupplierListComponent],
  imports: [SharedModule, SuppliersRoutingModule, AgGridAngular],
})
export class SuppliersModule {}
