import { InvoiceStatus } from '../enums/InvoiceStatus';
import { InvoiceType } from '../enums/InvoiceType';
import { InvoiceItemResponse } from './InvoiceItemResponse';

export class InvoiceResponse {
  id?: string;
  invoiceNcId?: string;
  invoiceDate?: string;
  invoiceDateFormatted?: string;
  dueDate?: string;
  dueDateFormatted?: string;
  type?: InvoiceType;
  storeId?: string;
  storeName?: string;
  customerId?: string;
  customerName?: string;
  supplierId?: string;
  supplierName?: string;
  receiveId?: string;
  salesId?: string;
  subTotal?: number;
  discountTotal?: number;
  vatTotal?: number;
  taxTotal?: number;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  remarks?: string;
  invoiceStatus?: InvoiceStatus;
  items?: InvoiceItemResponse[];
}
