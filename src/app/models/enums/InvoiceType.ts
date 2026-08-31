export const INVOICE_TYPES = ['SALES', 'PURCHASE'] as const;

export type InvoiceType = (typeof INVOICE_TYPES)[number];

const TYPE_LABELS: Record<InvoiceType, string> = {
  SALES: 'Sales',
  PURCHASE: 'Purchase',
};

export function invoiceTypeLabel(type?: string | null): string {
  if (!type) {
    return '—';
  }
  return TYPE_LABELS[type as InvoiceType] || type.replaceAll('_', ' ');
}
