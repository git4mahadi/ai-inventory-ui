import { PaymentMethod } from '../enums/SalesStatus';

export class InvoiceDueCollectionDto {
  invoiceIds: string[] = [];
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  remarks?: string;
  referenceNo?: string;
  storeId?: string;
  customerId?: string;

  public constructor(init?: Partial<InvoiceDueCollectionDto>) {
    Object.assign(this, init);
  }
}
