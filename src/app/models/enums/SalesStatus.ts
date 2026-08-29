export const SALES_STATUSES = [
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

const STATUS_LABELS: Record<SalesStatus, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export function salesStatusLabel(status?: string | null): string {
  if (!status) {
    return '—';
  }
  return STATUS_LABELS[status as SalesStatus] || status.replaceAll('_', ' ');
}

export function isSalesEditable(status?: string | null): boolean {
  return status === 'PENDING';
}

export const PAYMENT_METHODS = [
  'CASH',
  'BANK',
  'MOBILE_BANKING',
  'CHEQUE',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  BANK: 'Bank',
  MOBILE_BANKING: 'Mobile banking',
  CHEQUE: 'Cheque',
};

export function paymentMethodLabel(method?: string | null): string {
  if (!method) {
    return '—';
  }
  return PAYMENT_LABELS[method as PaymentMethod] || method.replaceAll('_', ' ');
}
