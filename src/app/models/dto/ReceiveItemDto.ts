import { prop } from '@rxweb/reactive-form-validators';

export class ReceiveItemDto {
  @prop() itemId?: string;
  @prop() receivedQty?: number;
  @prop() rejectedQty?: number;
  @prop() unitPrice?: number;
  @prop() lineTotal?: number;
  @prop() uom?: string;
  @prop() batchNo?: string;
  @prop() expireDate?: string;
  @prop() remarks?: string;

  public constructor(init?: Partial<ReceiveItemDto>) {
    Object.assign(this, init);
  }
}
