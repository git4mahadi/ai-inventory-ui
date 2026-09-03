import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LookupListComponent } from './lookup-list/lookup-list.component';

const routes: Routes = [
  {
    path: '',
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
    path: 'edit/:id',
    component: LookupListComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LookupsRoutingModule {}
