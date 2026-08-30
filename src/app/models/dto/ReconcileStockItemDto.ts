import { prop } from '@rxweb/reactive-form-validators';
import { ReconcileType } from '../enums/ReconcileType';

export class ReconcileStockItemDto {
  @prop() itemId?: string;
  @prop() reconcileTypeEnumKey?: ReconcileType;
  @prop() reconcileQty?: number;
  @prop() uom?: string;
  @prop() batchNo?: string;
  @prop() expireDate?: string;
  @prop() remarks?: string;

  public constructor(init?: Partial<ReconcileStockItemDto>) {
    Object.assign(this, init);
  }
}
