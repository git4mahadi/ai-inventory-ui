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
        path: 'sales',
        loadChildren: () =>
          import('../sales/sales.module').then((m) => m.SalesModule),
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
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainRoutingModule {}
