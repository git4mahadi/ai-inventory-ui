import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { SalesCreateComponent } from './components/sales-create/sales-create.component';
import { SalesListComponent } from './components/sales-list/sales-list.component';
import { SalesRoutingModule } from './sales-routing.module';

@NgModule({
  declarations: [SalesListComponent, SalesCreateComponent],
  imports: [SharedModule, SalesRoutingModule, AgGridAngular],
})
export class SalesModule {}
