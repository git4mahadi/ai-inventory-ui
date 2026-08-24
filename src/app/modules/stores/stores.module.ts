import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { StoreCreateComponent } from './store-create/store-create.component';
import { StoreEditComponent } from './store-edit/store-edit.component';
import { StoreListComponent } from './store-list/store-list.component';
import { StockListComponent } from './stock-list/stock-list.component';
import { StoresRoutingModule } from './stores-routing.module';

@NgModule({
  declarations: [
    StoreListComponent,
    StoreCreateComponent,
    StoreEditComponent,
    StockListComponent,
  ],
  imports: [SharedModule, StoresRoutingModule],
})
export class StoresModule {}
