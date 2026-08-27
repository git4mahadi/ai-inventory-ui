import { prop } from '@rxweb/reactive-form-validators';
import { ReceiveItemDto } from './ReceiveItemDto';

export class ReceiveDto {
  @prop() receiveDate?: string;
  @prop() purchaseOrderId?: string;
  @prop() storeId?: string;
  @prop() supplierId?: string;
  @prop() items?: ReceiveItemDto[];

  public constructor(init?: Partial<ReceiveDto>) {
    Object.assign(this, init);
  }
}
