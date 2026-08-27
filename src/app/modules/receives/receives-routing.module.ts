import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReceiveCreateComponent } from './receive-create/receive-create.component';
import { ReceiveEditComponent } from './receive-edit/receive-edit.component';
import { ReceiveListComponent } from './receive-list/receive-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full',
  },
  {
    path: 'list',
    component: ReceiveListComponent,
  },
  {
    path: 'create',
    component: ReceiveCreateComponent,
  },
  {
    path: 'edit/:id',
    component: ReceiveEditComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReceivesRoutingModule {}
