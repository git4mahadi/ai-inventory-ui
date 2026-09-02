import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CurrentStockReportComponent } from './current-stock/current-stock-report.component';
import { ExpiredStockReportComponent } from './expired-stock/expired-stock-report.component';
import { IncomeStatementReportComponent } from './income-statement/income-statement-report.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'current-stock',
    pathMatch: 'full',
  },
  {
    path: 'current-stock',
    component: CurrentStockReportComponent,
  },
  {
    path: 'expired-stock',
    component: ExpiredStockReportComponent,
  },
  {
    path: 'income-statement',
    component: IncomeStatementReportComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}
