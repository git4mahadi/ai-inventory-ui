export interface SalesCartItem {
  itemId: string;
  itemName: string;
  itemCode?: string;
  quantity: number;
  unitPrice: number;
  purchaseRate?: number;
  salesRate?: number;
  currentStock?: number;
  availableStock: number;
  discountAmount: number;
}

export interface SalesCartTotals {
  subTotal: number;
  discountAmount: number;
  grandTotal: number;
}

export function salesLineGross(item: {
  quantity?: number | string | null;
  unitPrice?: number | string | null;
}): number {
  return toNumber(item.quantity) * toNumber(item.unitPrice);
}

export function salesLineTotal(item: {
  quantity?: number | string | null;
  unitPrice?: number | string | null;
  discountAmount?: number | string | null;
}): number {
  return Math.max(0, salesLineGross(item) - toNumber(item.discountAmount));
}

export function distributeSalesDiscount(
  items: SalesCartItem[],
  discountAmount: number,
): SalesCartItem[] {
  const totalGross = items.reduce((sum, item) => sum + salesLineGross(item), 0);
  const target = Math.max(0, toNumber(discountAmount));
  if (!items.length || totalGross <= 0 || target <= 0) {
    return items.map((item) => ({ ...item, discountAmount: 0 }));
  }

  const capped = Math.min(target, totalGross);
  let remaining = capped;
  return items.map((item, index) => {
    const gross = salesLineGross(item);
    if (index === items.length - 1) {
      return { ...item, discountAmount: roundMoney(Math.min(remaining, gross)) };
    }
    const share = roundMoney(Math.min(gross, (gross / totalGross) * capped));
    remaining = roundMoney(remaining - share);
    return { ...item, discountAmount: share };
  });
}

export function salesCartTotals(items: SalesCartItem[]): SalesCartTotals {
  const subTotal = roundMoney(items.reduce((sum, item) => sum + salesLineGross(item), 0));
  const discountAmount = roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.discountAmount), 0),
  );
  return {
    subTotal,
    discountAmount,
    grandTotal: roundMoney(Math.max(0, subTotal - discountAmount)),
  };
}

export function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
