import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { CurrentStockReportComponent } from './current-stock/current-stock-report.component';
import { ExpenseReportComponent } from './expense/expense-report.component';
import { ExpiredStockReportComponent } from './expired-stock/expired-stock-report.component';
import { IncomeStatementReportComponent } from './income-statement/income-statement-report.component';
import { InvoiceWiseProfitReportComponent } from './invoice-wise-profit/invoice-wise-profit-report.component';
import { ItemWiseProfitReportComponent } from './item-wise-profit/item-wise-profit-report.component';
import { ReportsRoutingModule } from './reports-routing.module';

@NgModule({
  declarations: [
    CurrentStockReportComponent,
    ExpiredStockReportComponent,
    IncomeStatementReportComponent,
    ExpenseReportComponent,
    ItemWiseProfitReportComponent,
    InvoiceWiseProfitReportComponent,
  ],
  imports: [SharedModule, ReportsRoutingModule],
})
export class ReportsModule {}
