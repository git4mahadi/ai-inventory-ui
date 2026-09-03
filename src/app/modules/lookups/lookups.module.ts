import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { LookupListComponent } from './lookup-list/lookup-list.component';
import { LookupsRoutingModule } from './lookups-routing.module';

@NgModule({
  declarations: [LookupListComponent],
  imports: [SharedModule, LookupsRoutingModule, AgGridAngular],
})
export class LookupsModule {}
