import { ReconcileStockItemResponse } from './ReconcileStockItemResponse';

export class ReconcileStockResponse {
  id?: string;
  reconcileStockNcId?: string;
  reconcileDate?: string;
  reconcileDateFormatted?: string;
  storeId?: string;
  storeName?: string;
  items?: ReconcileStockItemResponse[];
}
