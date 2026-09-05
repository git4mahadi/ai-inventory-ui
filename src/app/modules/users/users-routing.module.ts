import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserListComponent } from './user-list/user-list.component';

const routes: Routes = [
  {
    path: 'edit/:id',
    component: UserListComponent,
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
    component: UserListComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersRoutingModule {}
