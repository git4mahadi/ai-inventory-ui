import { AbstractControl } from '@angular/forms';
import { PurchaseOrderItemResponse } from '../../models/response/PurchaseOrderItemResponse';

export function resolveItemId(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    const obj = value as { itemId?: string; id?: string };
    return obj.itemId || obj.id || null;
  }
  return String(value);
}

export function toQty(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundQty(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function maxReceivableByItemId(
  poItems: PurchaseOrderItemResponse[] | null | undefined,
  creditByItemId?: Map<string, number>,
): Map<string, number> {
  const orderedByItem = new Map<string, number>();
  const receivedByItem = new Map<string, number>();

  for (const item of poItems ?? []) {
    const itemId = resolveItemId(item.itemId);
    if (!itemId) {
      continue;
    }
    orderedByItem.set(itemId, roundQty((orderedByItem.get(itemId) || 0) + toQty(item.orderedQty)));
    receivedByItem.set(
      itemId,
      Math.max(receivedByItem.get(itemId) || 0, toQty(item.receivedQty)),
    );
  }

  const maxByItem = new Map<string, number>();
  for (const [itemId, orderedQty] of orderedByItem) {
    const alreadyReceived = receivedByItem.get(itemId) || 0;
    const credit = creditByItemId?.get(itemId) || 0;
    maxByItem.set(itemId, roundQty(Math.max(0, orderedQty - alreadyReceived + credit)));
  }
  return maxByItem;
}

export function alreadyReceivedQtyByItemId(
  poItems: PurchaseOrderItemResponse[] | null | undefined,
  creditByItemId?: Map<string, number>,
): Map<string, number> {
  const receivedByItem = new Map<string, number>();
  for (const item of poItems ?? []) {
    const itemId = resolveItemId(item.itemId);
    if (!itemId) {
      continue;
    }
    receivedByItem.set(
      itemId,
      Math.max(receivedByItem.get(itemId) || 0, toQty(item.receivedQty)),
    );
  }

  const alreadyByItem = new Map<string, number>();
  const itemIds = new Set<string>([
    ...receivedByItem.keys(),
    ...(poItems ?? [])
      .map((item) => resolveItemId(item.itemId))
      .filter((itemId): itemId is string => !!itemId),
  ]);
  for (const itemId of itemIds) {
    const credit = creditByItemId?.get(itemId) || 0;
    alreadyByItem.set(
      itemId,
      roundQty(Math.max(0, (receivedByItem.get(itemId) || 0) - credit)),
    );
  }
  return alreadyByItem;
}

export function creditReceivedByItemId(
  items: Array<{ itemId?: string; receivedQty?: number | string | null }> | null | undefined,
): Map<string, number> {
  const credit = new Map<string, number>();
  for (const item of items ?? []) {
    const itemId = resolveItemId(item.itemId);
    if (!itemId) {
      continue;
    }
    credit.set(itemId, roundQty((credit.get(itemId) || 0) + toQty(item.receivedQty)));
  }
  return credit;
}

export function sumReceivedQtyByItemId(rows: AbstractControl[]): Map<string, number> {
  const receivedByItem = new Map<string, number>();
  for (const row of rows) {
    const itemId = resolveItemId(row.get('itemId')?.value);
    if (!itemId) {
      continue;
    }
    receivedByItem.set(
      itemId,
      roundQty((receivedByItem.get(itemId) || 0) + toQty(row.get('receivedQty')?.value)),
    );
  }
  return receivedByItem;
}

export function receivedQtyExceedsMax(
  rows: AbstractControl[],
  maxByItemId: Map<string, number>,
): boolean {
  const receivedByItem = sumReceivedQtyByItemId(rows);
  for (const [itemId, receivedQty] of receivedByItem) {
    const maxQty = maxByItemId.get(itemId);
    if (maxQty == null || receivedQty > maxQty) {
      return true;
    }
  }
  return false;
}
