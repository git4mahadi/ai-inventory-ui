export class ItemWiseCurrentStockReportDto {
  itemId?: string;
  itemName?: string;
  itemCode?: string;
  itemBarcode?: string;
  packSizeName?: string;
  storeId?: string;
  storeName?: string;
  currentStock?: number;
  purchaseRate?: number;
  salesRate?: number;
  stockValue?: number;
}
