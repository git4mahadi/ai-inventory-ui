export class InvoiceItemResponse {
  id?: string;
  invoiceId?: string;
  itemId?: string;
  receiveItemId?: string;
  salesItemId?: string;
  quantity?: number;
  unitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  vatPercent?: number;
  vatAmount?: number;
  taxPercent?: number;
  taxAmount?: number;
  lineTotal?: number;
}
