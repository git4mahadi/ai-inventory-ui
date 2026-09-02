export class CurrentExpiredStockReportDto {
  batchId?: string;
  itemId?: string;
  itemName?: string;
  itemCode?: string;
  itemBarcode?: string;
  packSizeName?: string;
  storeId?: string;
  storeName?: string;
  batchNo?: string;
  expireDate?: string;
  daysToExpire?: number;
  currentQty?: number;
  purchaseRate?: number;
  stockValue?: number;
}
