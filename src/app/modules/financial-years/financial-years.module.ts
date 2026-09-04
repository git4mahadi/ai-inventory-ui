import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { FinancialYearListComponent } from './financial-year-list/financial-year-list.component';
import { FinancialYearsRoutingModule } from './financial-years-routing.module';

@NgModule({
  declarations: [FinancialYearListComponent],
  imports: [SharedModule, FinancialYearsRoutingModule, AgGridAngular],
})
export class FinancialYearsModule {}
