import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
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
        loadChildren: () =>
          import('../customers/customers.module').then((m) => m.CustomersModule),
      },
      {
        path: 'stores',
        loadChildren: () =>
          import('../stores/stores.module').then((m) => m.StoresModule),
      },
      {
        path: 'financial-years',
        loadChildren: () =>
          import('../financial-years/financial-years.module').then(
            (m) => m.FinancialYearsModule,
          ),
      },
      {
        path: 'suppliers',
        loadChildren: () =>
          import('../suppliers/suppliers.module').then((m) => m.SuppliersModule),
      },
      {
        path: 'lookups',
        loadChildren: () =>
          import('../lookups/lookups.module').then((m) => m.LookupsModule),
      },
      {
        path: 'items',
        loadChildren: () =>
          import('../items/items.module').then((m) => m.ItemsModule),
      },
      {
        path: 'opening-stocks',
        loadChildren: () =>
          import('../opening-stocks/opening-stocks.module').then(
            (m) => m.OpeningStocksModule,
          ),
      },
      {
        path: 'purchase-orders',
        loadChildren: () =>
          import('../purchase-orders/purchase-orders.module').then(
            (m) => m.PurchaseOrdersModule,
          ),
      },
      {
        path: 'receives',
        loadChildren: () =>
          import('../receives/receives.module').then((m) => m.ReceivesModule),
      },
      {
        path: 'sales',
        loadChildren: () =>
          import('../sales/sales.module').then((m) => m.SalesModule),
      },
      {
        path: 'expenses',
        loadChildren: () =>
          import('../expenses/expenses.module').then((m) => m.ExpensesModule),
      },
      {
        path: 'reconcile-stocks',
        loadChildren: () =>
          import('../reconcile-stocks/reconcile-stocks.module').then(
            (m) => m.ReconcileStocksModule,
          ),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('../reports/reports.module').then((m) => m.ReportsModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
