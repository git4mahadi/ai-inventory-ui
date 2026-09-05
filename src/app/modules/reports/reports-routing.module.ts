import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
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
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.currentStockReport },
  },
  {
    path: 'expired-stock',
    component: ExpiredStockReportComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.expiredStockReport },
  },
  {
    path: 'income-statement',
    component: IncomeStatementReportComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.incomeStatementReport },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportsRoutingModule {}
