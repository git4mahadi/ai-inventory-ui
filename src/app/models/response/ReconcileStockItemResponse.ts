import { ReconcileType } from '../enums/ReconcileType';

export class ReconcileStockItemResponse {
  id?: string;
  reconcileStockId?: string;
  itemId?: string;
  itemName?: string;
  reconcileTypeEnumKey?: ReconcileType;
  reconcileTypeEnumValue?: string;
  reconcileQty?: number;
  uom?: string;
  batchNo?: string;
  expireDate?: string;
  expireDateFormatted?: string;
  remarks?: string;
}
