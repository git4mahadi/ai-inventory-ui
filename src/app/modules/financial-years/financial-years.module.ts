import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { FinancialYearCreateComponent } from './financial-year-create/financial-year-create.component';
import { FinancialYearEditComponent } from './financial-year-edit/financial-year-edit.component';
import { FinancialYearListComponent } from './financial-year-list/financial-year-list.component';
import { FinancialYearsRoutingModule } from './financial-years-routing.module';

@NgModule({
  declarations: [
    FinancialYearListComponent,
    FinancialYearCreateComponent,
    FinancialYearEditComponent,
  ],
  imports: [SharedModule, FinancialYearsRoutingModule, AgGridAngular],
})
export class FinancialYearsModule {}
