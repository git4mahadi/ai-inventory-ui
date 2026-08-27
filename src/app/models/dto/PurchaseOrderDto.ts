import { prop } from '@rxweb/reactive-form-validators';
import { PurchaseOrderStatus } from '../enums/PurchaseOrderStatus';
import { PurchaseOrderItemDto } from './PurchaseOrderItemDto';

export class PurchaseOrderDto {
  @prop() orderDate?: string;
  @prop() expectedDate?: string;
  @prop() storeId?: string;
  @prop() supplierId?: string;
  @prop() subTotal?: number;
  @prop() discountAmount?: number;
  @prop() taxAmount?: number;
  @prop() shippingCharge?: number;
  @prop() otherCharge?: number;
  @prop() grandTotal?: number;
  @prop() remarks?: string;
  @prop() orderStatus?: PurchaseOrderStatus;
  @prop() items?: PurchaseOrderItemDto[];

  public constructor(init?: Partial<PurchaseOrderDto>) {
    Object.assign(this, init);
  }
}
