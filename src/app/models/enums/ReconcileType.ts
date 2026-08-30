export const RECONCILE_TYPES = ['WRITE_ON', 'WRITE_OFF'] as const;

export type ReconcileType = (typeof RECONCILE_TYPES)[number];

const TYPE_LABELS: Record<ReconcileType, string> = {
  WRITE_ON: 'Write On',
  WRITE_OFF: 'Write Off',
};

export function reconcileTypeLabel(type?: string | null): string {
  if (!type) {
    return '—';
  }
  return TYPE_LABELS[type as ReconcileType] || type.replaceAll('_', ' ');
}
