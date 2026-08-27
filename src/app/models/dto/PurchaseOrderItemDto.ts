import { prop } from '@rxweb/reactive-form-validators';

export class PurchaseOrderItemDto {
  @prop() itemId?: string;
  @prop() orderedQty?: number;
  @prop() receivedQty?: number;
  @prop() unitPrice?: number;
  @prop() discountPercent?: number;
  @prop() discountAmount?: number;
  @prop() taxPercent?: number;
  @prop() taxAmount?: number;
  @prop() lineTotal?: number;
  @prop() remarks?: string;

  public constructor(init?: Partial<PurchaseOrderItemDto>) {
    Object.assign(this, init);
  }
}
