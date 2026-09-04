import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class ExpenseSearchDto extends SearchDto {
  @prop() expenseDateFrom?: string;
  @prop() expenseDateTo?: string;
  @prop() id?: string;
  @prop() expenseDate?: string;
  @prop() expenseHeadId?: string;
  @prop() expenseHeadName?: string;
  @prop() amount?: number;
  @prop() remarks?: string;
  @prop() createdById?: string;

  public constructor(init?: Partial<ExpenseSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
