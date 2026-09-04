import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { StoreListComponent } from './store-list/store-list.component';
import { StockListComponent } from './stock-list/stock-list.component';
import { StoresRoutingModule } from './stores-routing.module';

@NgModule({
  declarations: [StoreListComponent, StockListComponent],
  imports: [SharedModule, StoresRoutingModule, AgGridAngular],
})
export class StoresModule {}
