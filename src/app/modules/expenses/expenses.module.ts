import { NgModule } from '@angular/core';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap/modal';
import { AgGridAngular } from 'ag-grid-angular';
import { SharedModule } from '../../shared/shared.module';
import { ExpenseEditDialogComponent } from './expense-edit-dialog/expense-edit-dialog.component';
import { ExpenseListComponent } from './expense-list/expense-list.component';
import { ExpensesRoutingModule } from './expenses-routing.module';

@NgModule({
  declarations: [ExpenseListComponent, ExpenseEditDialogComponent],
  imports: [SharedModule, ExpensesRoutingModule, AgGridAngular, NgbModalModule],
})
export class ExpensesModule {}
