import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserGroupListComponent } from './user-group-list/user-group-list.component';

const routes: Routes = [
  {
    path: 'edit/:id',
    component: UserGroupListComponent,
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
    component: UserGroupListComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserGroupsRoutingModule {}
