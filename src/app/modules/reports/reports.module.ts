import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CurrentStockReportComponent } from './current-stock/current-stock-report.component';
import { ExpenseReportComponent } from './expense/expense-report.component';
import { ExpiredStockReportComponent } from './expired-stock/expired-stock-report.component';
import { IncomeStatementReportComponent } from './income-statement/income-statement-report.component';
import { ReportsRoutingModule } from './reports-routing.module';

@NgModule({
  declarations: [
    CurrentStockReportComponent,
    ExpiredStockReportComponent,
    IncomeStatementReportComponent,
    ExpenseReportComponent,
  ],
  imports: [SharedModule, ReportsRoutingModule],
})
export class ReportsModule {}
