import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LookupListComponent } from './lookup-list/lookup-list.component';

const routes: Routes = [
  {
    path: 'edit/:id',
    component: LookupListComponent,
  },
  {
    path: 'list',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'create',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    component: LookupListComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LookupsRoutingModule {}
