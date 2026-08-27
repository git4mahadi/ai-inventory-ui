import { PurchaseOrderStatus } from '../enums/PurchaseOrderStatus';
import { PurchaseOrderItemResponse } from './PurchaseOrderItemResponse';

export class PurchaseOrderResponse {
  id?: string;
  orderNcId?: string;
  orderDate?: string;
  expectedDate?: string;
  storeId?: string;
  supplierId?: string;
  subTotal?: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingCharge?: number;
  otherCharge?: number;
  grandTotal?: number;
  remarks?: string;
  orderStatus?: PurchaseOrderStatus;
  items?: PurchaseOrderItemResponse[];
}
