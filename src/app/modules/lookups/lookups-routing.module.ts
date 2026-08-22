import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LookupCreateComponent } from './lookup-create/lookup-create.component';
import { LookupEditComponent } from './lookup-edit/lookup-edit.component';
import { LookupListComponent } from './lookup-list/lookup-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: LookupListComponent,
  },
  {
    path: 'create',
    component: LookupCreateComponent,
  },
  {
    path: 'edit/:id',
    component: LookupEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LookupsRoutingModule {}
