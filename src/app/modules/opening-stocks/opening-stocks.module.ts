import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { OpeningStockCreateComponent } from './opening-stock-create/opening-stock-create.component';
import { OpeningStockEditComponent } from './opening-stock-edit/opening-stock-edit.component';
import { OpeningStockListComponent } from './opening-stock-list/opening-stock-list.component';
import { OpeningStocksRoutingModule } from './opening-stocks-routing.module';

@NgModule({
  declarations: [
    OpeningStockListComponent,
    OpeningStockCreateComponent,
    OpeningStockEditComponent,
  ],
  imports: [SharedModule, OpeningStocksRoutingModule],
})
export class OpeningStocksModule {}
