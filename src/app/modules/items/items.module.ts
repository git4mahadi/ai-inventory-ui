import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ItemCreateComponent } from './item-create/item-create.component';
import { ItemEditComponent } from './item-edit/item-edit.component';
import { ItemListComponent } from './item-list/item-list.component';
import { ItemsRoutingModule } from './items-routing.module';

@NgModule({
  declarations: [ItemListComponent, ItemCreateComponent, ItemEditComponent],
  imports: [SharedModule, ItemsRoutingModule],
})
export class ItemsModule {}
