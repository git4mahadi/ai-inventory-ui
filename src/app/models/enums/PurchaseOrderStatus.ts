export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'PARTIALLY_INVOICED',
  'INVOICED',
  'CANCELLED',
  'CLOSED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  PARTIALLY_RECEIVED: 'Partially received',
  RECEIVED: 'Received',
  PARTIALLY_INVOICED: 'Partially invoiced',
  INVOICED: 'Invoiced',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

export function purchaseOrderStatusLabel(status?: string | null): string {
  if (!status) {
    return '—';
  }
  return STATUS_LABELS[status as PurchaseOrderStatus] || status.replaceAll('_', ' ');
}

export function isPurchaseOrderEditable(status?: string | null): boolean {
  return status === 'SUBMITTED';
}
