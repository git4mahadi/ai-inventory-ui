import { ReconcileType } from '../../models/enums/ReconcileType';

export interface ReconcileCartItem {
  itemId: string;
  itemName: string;
  itemCode?: string;
  reconcileTypeEnumKey: ReconcileType;
  reconcileQty: number;
  uom?: string;
  uomId?: string | null;
  batchNo: string;
  expireDate?: Date | null;
  remarks?: string;
  currentStock?: number;
}

export interface ReconcileCartTotals {
  writeOnQty: number;
  writeOffQty: number;
  lineCount: number;
}

export function reconcileCartKey(item: {
  itemId?: string | null;
  batchNo?: string | null;
}): string {
  return `${item.itemId || ''}|${String(item.batchNo || '').trim()}`;
}

export function reconcileCartTotals(items: ReconcileCartItem[]): ReconcileCartTotals {
  return {
    writeOnQty: roundQty(
      items
        .filter((item) => item.reconcileTypeEnumKey === 'WRITE_ON')
        .reduce((sum, item) => sum + toNumber(item.reconcileQty), 0),
    ),
    writeOffQty: roundQty(
      items
        .filter((item) => item.reconcileTypeEnumKey === 'WRITE_OFF')
        .reduce((sum, item) => sum + toNumber(item.reconcileQty), 0),
    ),
    lineCount: items.length,
  };
}

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundQty(value: number): number {
  return Math.round(value * 100) / 100;
}
