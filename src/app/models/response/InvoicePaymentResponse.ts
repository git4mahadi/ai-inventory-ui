import { PaymentMethod } from '../enums/SalesStatus';
import { InvoicePaymentAllocationResponse } from './InvoicePaymentAllocationResponse';

export class InvoicePaymentResponse {
  id?: string;
  paymentType?: string;
  referenceNo?: string;
  amount?: number;
  paymentDate?: string;
  paymentDateFormatted?: string;
  paymentMethod?: PaymentMethod;
  remarks?: string;
  customerId?: string;
  customerName?: string;
  storeId?: string;
  storeName?: string;
  allocations?: InvoicePaymentAllocationResponse[];
}
