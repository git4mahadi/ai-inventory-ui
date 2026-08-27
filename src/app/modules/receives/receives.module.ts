import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { ReceiveCreateComponent } from './receive-create/receive-create.component';
import { ReceiveEditComponent } from './receive-edit/receive-edit.component';
import { ReceiveListComponent } from './receive-list/receive-list.component';
import { ReceivesRoutingModule } from './receives-routing.module';

@NgModule({
  declarations: [
    ReceiveListComponent,
    ReceiveCreateComponent,
    ReceiveEditComponent,
  ],
  imports: [SharedModule, ReceivesRoutingModule, AgGridAngular],
})
export class ReceivesModule {}
