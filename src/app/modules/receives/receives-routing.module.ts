import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermissionGuard } from '../../core/guards/permission.guard';
import { MenuRoles } from '../../core/security/menu-access';
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
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.receiveList },
  },
  {
    path: 'create',
    component: ReceiveCreateComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.receiveCreate },
  },
  {
    path: 'edit/:id',
    component: ReceiveEditComponent,
    canActivate: [PermissionGuard],
    data: { roles: MenuRoles.receiveEdit },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReceivesRoutingModule {}
