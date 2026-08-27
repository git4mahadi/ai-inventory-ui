export function calculatePurchaseOrderLineTotal(item: {
  orderedQty?: number | string | null;
  unitPrice?: number | string | null;
  discountPercent?: number | string | null;
  discountAmount?: number | string | null;
  taxPercent?: number | string | null;
  taxAmount?: number | string | null;
}): number {
  const orderedQty = toNumber(item.orderedQty);
  const unitPrice = toNumber(item.unitPrice);
  const grossTotal = orderedQty * unitPrice;
  const discountAmount = toNumber(item.discountAmount);
  const discountPercentAmount = (grossTotal * toNumber(item.discountPercent)) / 100;
  const taxableAmount = grossTotal - discountAmount - discountPercentAmount;
  const taxAmount = toNumber(item.taxAmount);
  const taxPercentAmount = (taxableAmount * toNumber(item.taxPercent)) / 100;
  return taxableAmount + taxAmount + taxPercentAmount;
}

export function calculatePurchaseOrderGrandTotal(input: {
  subTotal?: number | string | null;
  discountAmount?: number | string | null;
  taxAmount?: number | string | null;
  shippingCharge?: number | string | null;
  otherCharge?: number | string | null;
}): number {
  return (
    toNumber(input.subTotal) -
    toNumber(input.discountAmount) +
    toNumber(input.taxAmount) +
    toNumber(input.shippingCharge) +
    toNumber(input.otherCharge)
  );
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
