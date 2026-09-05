import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import {
  ITEMS_MODULE_ROLES,
  MenuRoles,
  REPORTS_MODULE_ROLES,
  SALES_MODULE_ROLES,
  STORES_MODULE_ROLES,
} from '../../core/security/menu-access';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';

const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then((m) => m.DashboardModule),
      },
      {
        path: 'customers',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.customer },
        loadChildren: () =>
          import('../customers/customers.module').then((m) => m.CustomersModule),
      },
      {
        path: 'stores',
        canActivate: [PermissionGuard],
        data: { roles: STORES_MODULE_ROLES },
        loadChildren: () =>
          import('../stores/stores.module').then((m) => m.StoresModule),
      },
      {
        path: 'financial-years',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.financialYear },
        loadChildren: () =>
          import('../financial-years/financial-years.module').then(
            (m) => m.FinancialYearsModule,
          ),
      },
      {
        path: 'suppliers',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.supplier },
        loadChildren: () =>
          import('../suppliers/suppliers.module').then((m) => m.SuppliersModule),
      },
      {
        path: 'lookups',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.lookup },
        loadChildren: () =>
          import('../lookups/lookups.module').then((m) => m.LookupsModule),
      },
      {
        path: 'items',
        canActivate: [PermissionGuard],
        data: { roles: ITEMS_MODULE_ROLES },
        loadChildren: () =>
          import('../items/items.module').then((m) => m.ItemsModule),
      },
      {
        path: 'opening-stocks',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.openingStockAny },
        loadChildren: () =>
          import('../opening-stocks/opening-stocks.module').then(
            (m) => m.OpeningStocksModule,
          ),
      },
      {
        path: 'purchase-orders',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.purchaseOrderAny },
        loadChildren: () =>
          import('../purchase-orders/purchase-orders.module').then(
            (m) => m.PurchaseOrdersModule,
          ),
      },
      {
        path: 'receives',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.receiveAny },
        loadChildren: () =>
          import('../receives/receives.module').then((m) => m.ReceivesModule),
      },
      {
        path: 'sales',
        canActivate: [PermissionGuard],
        data: { roles: SALES_MODULE_ROLES },
        loadChildren: () =>
          import('../sales/sales.module').then((m) => m.SalesModule),
      },
      {
        path: 'expenses',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.expense },
        loadChildren: () =>
          import('../expenses/expenses.module').then((m) => m.ExpensesModule),
      },
      {
        path: 'reconcile-stocks',
        canActivate: [PermissionGuard],
        data: { roles: MenuRoles.reconcileStockAny },
        loadChildren: () =>
          import('../reconcile-stocks/reconcile-stocks.module').then(
            (m) => m.ReconcileStocksModule,
          ),
      },
      {
        path: 'reports',
        canActivate: [PermissionGuard],
        data: { roles: REPORTS_MODULE_ROLES },
        loadChildren: () =>
          import('../reports/reports.module').then((m) => m.ReportsModule),
      },
      {
        path: 'user-groups',
        canActivate: [PermissionGuard],
        data: { requireAdmin: true },
        loadChildren: () =>
          import('../user-groups/user-groups.module').then((m) => m.UserGroupsModule),
      },
      {
        path: 'users',
        canActivate: [PermissionGuard],
        data: { requireAdmin: true },
        loadChildren: () =>
          import('../users/users.module').then((m) => m.UsersModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
