import { ReturnItemResponse } from './ReturnItemResponse';

export class ReturnResponse {
  id?: string;
  returnNcId?: string;
  returnDate?: string;
  returnDateFormatted?: string;
  returnType?: string;
  invoiceId?: string;
  invoiceNcId?: string;
  storeId?: string;
  storeName?: string;
  customerId?: string;
  customerName?: string;
  subTotal?: number;
  discountAmount?: number;
  restockingFee?: number;
  vatAdjustment?: number;
  taxAdjustment?: number;
  refundAmount?: number;
  returnItems?: ReturnItemResponse[];
}
