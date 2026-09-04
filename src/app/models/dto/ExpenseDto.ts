import { prop } from '@rxweb/reactive-form-validators';

export class ExpenseDto {
  @prop() expenseDate?: string;
  @prop() expenseHeadId?: string;
  @prop() amount?: number;
  @prop() remarks?: string;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<ExpenseDto>) {
    Object.assign(this, init);
  }
}
