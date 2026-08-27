export const ITEM_RECEIVE_STATUSES = [
  'DRAFT',
  'POSTED',
  'PARTIALLY_POSTED',
  'CANCELLED',
] as const;

export type ItemReceiveStatus = (typeof ITEM_RECEIVE_STATUSES)[number];

const STATUS_LABELS: Record<ItemReceiveStatus, string> = {
  DRAFT: 'Draft',
  POSTED: 'Posted',
  PARTIALLY_POSTED: 'Partially posted',
  CANCELLED: 'Cancelled',
};

export function itemReceiveStatusLabel(status?: string | null): string {
  if (!status) {
    return '—';
  }
  return STATUS_LABELS[status as ItemReceiveStatus] || status.replaceAll('_', ' ');
}

export function isItemReceiveEditable(status?: string | null): boolean {
  return status === 'DRAFT';
}
