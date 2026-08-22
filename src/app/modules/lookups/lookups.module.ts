import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { LookupCreateComponent } from './lookup-create/lookup-create.component';
import { LookupEditComponent } from './lookup-edit/lookup-edit.component';
import { LookupListComponent } from './lookup-list/lookup-list.component';
import { LookupsRoutingModule } from './lookups-routing.module';

@NgModule({
  declarations: [
    LookupListComponent,
    LookupCreateComponent,
    LookupEditComponent,
  ],
  imports: [SharedModule, LookupsRoutingModule],
})
export class LookupsModule {}
