import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { SupplierCreateComponent } from './supplier-create/supplier-create.component';
import { SupplierEditComponent } from './supplier-edit/supplier-edit.component';
import { SupplierListComponent } from './supplier-list/supplier-list.component';
import { SuppliersRoutingModule } from './suppliers-routing.module';

@NgModule({
  declarations: [
    SupplierListComponent,
    SupplierCreateComponent,
    SupplierEditComponent,
  ],
  imports: [SharedModule, SuppliersRoutingModule],
})
export class SuppliersModule {}
