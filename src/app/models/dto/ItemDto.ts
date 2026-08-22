import { prop } from '@rxweb/reactive-form-validators';

export class ItemDto {
  @prop() itemName?: string;
  @prop() itemCode?: string;
  @prop() itemBarcode?: string;
  @prop() strength?: string;
  @prop() storeId?: string;
  @prop() supplierId?: string;
  @prop() supplierName?: string;
  @prop() packSizeId?: string;
  @prop() packSizeName?: string;
  @prop() locationId?: string;
  @prop() locationName?: string;
  @prop() purchaseRate?: number;
  @prop() salesRate?: number;
  @prop() reOrderLevel?: number;
  @prop() expireNotifyDays?: number;
  @prop() isForeignItem?: boolean;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<ItemDto>) {
    Object.assign(this, init);
  }
}
