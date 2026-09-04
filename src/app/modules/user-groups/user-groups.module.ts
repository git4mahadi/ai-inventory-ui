import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { UserGroupListComponent } from './user-group-list/user-group-list.component';
import { UserGroupsRoutingModule } from './user-groups-routing.module';

@NgModule({
  declarations: [UserGroupListComponent],
  imports: [SharedModule, UserGroupsRoutingModule, AgGridAngular],
})
export class UserGroupsModule {}
