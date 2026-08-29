import { PaymentMethod, SalesStatus } from '../enums/SalesStatus';
import { SalesItemResponse } from './SalesItemResponse';

export class SalesResponse {
  id?: string;
  invoiceNcId?: string;
  salesDate?: string;
  salesDateFormatted?: string;
  storeId?: string;
  storeName?: string;
  storeCode?: string;
  storeMobile?: string;
  storeAddress?: string;
  financialYearId?: string;
  fyCode?: string;
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  subTotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  salesStatus?: SalesStatus;
  items?: SalesItemResponse[];
}
