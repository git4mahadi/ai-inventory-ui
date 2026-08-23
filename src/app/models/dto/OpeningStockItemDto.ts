import { prop } from '@rxweb/reactive-form-validators';

export class OpeningStockItemDto {
  @prop() supplierId?: string;
  @prop() itemId?: string;
  @prop() itemName?: string;
  @prop() stockQty?: number;
  @prop() uom?: string;
  @prop() batchNo?: string;
  @prop() expireDate?: string;
  @prop() purchaseRate?: number;
  @prop() salesRate?: number;

  public constructor(init?: Partial<OpeningStockItemDto>) {
    Object.assign(this, init);
  }
}
