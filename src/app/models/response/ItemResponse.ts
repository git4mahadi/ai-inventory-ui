export class ItemResponse {
  id?: string;
  itemName?: string;
  itemCode?: string;
  itemBarcode?: string;
  strength?: string;
  storeId?: string;
  supplierId?: string;
  supplierName?: string;
  packSizeId?: string;
  packSizeName?: string;
  locationId?: string;
  locationName?: string;
  purchaseRate?: number;
  salesRate?: number;
  reOrderLevel?: number;
  expireNotifyDays?: number;
  isForeignItem?: boolean;
  enabled?: boolean;
  currentStock?: number;
}
