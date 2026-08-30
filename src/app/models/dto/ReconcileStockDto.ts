import { prop } from '@rxweb/reactive-form-validators';
import { ReconcileStockItemDto } from './ReconcileStockItemDto';

export class ReconcileStockDto {
  @prop() reconcileDate?: string;
  @prop() storeId?: string;
  @prop() items?: ReconcileStockItemDto[];

  public constructor(init?: Partial<ReconcileStockDto>) {
    Object.assign(this, init);
  }
}
