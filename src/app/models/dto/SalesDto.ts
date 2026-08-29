import { prop } from '@rxweb/reactive-form-validators';
import { PaymentMethod } from '../enums/SalesStatus';
import { SalesItemDto } from './SalesItemDto';

export class SalesDto {
  @prop() salesDate?: string;
  @prop() storeId?: string;
  @prop() financialYearId?: string;
  @prop() customerId?: string;
  @prop() subTotal?: number;
  @prop() discountAmount?: number;
  @prop() taxAmount?: number;
  @prop() totalAmount?: number;
  @prop() paidAmount?: number;
  @prop() dueAmount?: number;
  @prop() paymentMethod?: PaymentMethod;
  @prop() items?: SalesItemDto[];

  public constructor(init?: Partial<SalesDto>) {
    Object.assign(this, init);
  }
}
