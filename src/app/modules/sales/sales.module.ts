import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { SalesCreateComponent } from './sales-create/sales-create.component';
import { SalesEditComponent } from './sales-edit/sales-edit.component';
import { SalesListComponent } from './sales-list/sales-list.component';
import { SalesRoutingModule } from './sales-routing.module';

@NgModule({
  declarations: [SalesListComponent, SalesCreateComponent, SalesEditComponent],
  imports: [SharedModule, SalesRoutingModule, AgGridAngular],
})
export class SalesModule {}
