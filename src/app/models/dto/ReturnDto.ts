import { prop } from '@rxweb/reactive-form-validators';
import { ReturnItemDto } from './ReturnItemDto';

export class ReturnDto {
  @prop() returnDate?: string;
  @prop() returnType?: 'SALES_RETURN' | 'PURCHASE_RETURN';
  @prop() storeId?: string;
  @prop() customerId?: string;
  @prop() invoiceId?: string;
  @prop() returnItems?: ReturnItemDto[];

  public constructor(init?: Partial<ReturnDto>) {
    Object.assign(this, init);
  }
}
