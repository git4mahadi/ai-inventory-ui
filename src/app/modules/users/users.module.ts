import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { UserListComponent } from './user-list/user-list.component';
import { UsersRoutingModule } from './users-routing.module';

@NgModule({
  declarations: [UserListComponent],
  imports: [SharedModule, UsersRoutingModule, AgGridAngular],
})
export class UsersModule {}
