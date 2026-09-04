import { NgModule } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { ItemBarcodeGenerateComponent } from './item-barcode-generate/item-barcode-generate.component';
import { ItemListComponent } from './item-list/item-list.component';
import { ItemsRoutingModule } from './items-routing.module';

@NgModule({
  declarations: [ItemListComponent, ItemBarcodeGenerateComponent],
  imports: [SharedModule, ItemsRoutingModule, AgGridAngular],
})
export class ItemsModule {}
