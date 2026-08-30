import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { reconcileTypeLabel } from '../../../models/enums/ReconcileType';
import { ReconcileStockItemResponse } from '../../../models/response/ReconcileStockItemResponse';
import { ReconcileStockResponse } from '../../../models/response/ReconcileStockResponse';
import { roundQty, toNumber } from '../../../core/utils/reconcile-cart.util';
import { toDisplayDate } from '../../../core/utils/date.util';

@Component({
  selector: 'app-reconcile-stock-view-dialog',
  standalone: false,
  templateUrl: './reconcile-stock-view-dialog.component.html',
  styleUrl: './reconcile-stock-view-dialog.component.scss',
})
export class ReconcileStockViewDialogComponent {
  @Input() open = false;
  @Input() loading = false;
  @Input() record: ReconcileStockResponse | null = null;

  @Output() closed = new EventEmitter<void>();

  get items(): ReconcileStockItemResponse[] {
    return this.record?.items ?? [];
  }

  get writeOnQty(): number {
    return roundQty(
      this.items
        .filter((item) => item.reconcileTypeEnumKey === 'WRITE_ON')
        .reduce((sum, item) => sum + toNumber(item.reconcileQty), 0),
    );
  }

  get writeOffQty(): number {
    return roundQty(
      this.items
        .filter((item) => item.reconcileTypeEnumKey === 'WRITE_OFF')
        .reduce((sum, item) => sum + toNumber(item.reconcileQty), 0),
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && !this.loading) {
      this.onClose();
    }
  }

  displayDate(value?: string | null): string {
    return toDisplayDate(value) || '—';
  }

  typeLabel(item: ReconcileStockItemResponse): string {
    return item.reconcileTypeEnumValue || reconcileTypeLabel(item.reconcileTypeEnumKey);
  }

  onClose(): void {
    if (this.loading) {
      return;
    }
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
