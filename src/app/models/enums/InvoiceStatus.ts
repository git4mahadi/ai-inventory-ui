export const INVOICE_STATUSES = [
  'DRAFT',
  'POSTED',
  'PARTIALLY_PAID',
  'PAID',
  'CANCELLED',
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  POSTED: 'Posted',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export function invoiceStatusLabel(status?: string | null): string {
  if (!status) {
    return '—';
  }
  return STATUS_LABELS[status as InvoiceStatus] || status.replaceAll('_', ' ');
}
