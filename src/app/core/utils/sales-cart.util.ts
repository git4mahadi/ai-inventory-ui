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

/** Keep digits and at most one decimal point (for text qty/rate inputs). */
export function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) {
    return cleaned;
  }
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

/** Block non-decimal keystrokes on text inputs that should accept numbers. */
export function onDecimalKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
  ];
  if (allowedKeys.includes(event.key)) {
    return;
  }

  if (event.key === '.') {
    const input = event.target as HTMLInputElement | null;
    if (input?.value.includes('.')) {
      event.preventDefault();
    }
    return;
  }

  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}
