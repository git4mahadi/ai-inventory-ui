export class PurchaseOrderItemResponse {
  id?: string;
  purchaseOrderId?: string;
  itemId?: string;
  itemName?: string;
  orderedQty?: number;
  receivedQty?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal?: number;
  remarks?: string;
}
