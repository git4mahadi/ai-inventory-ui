import { prop } from '@rxweb/reactive-form-validators';

export class StoreDto {
  @prop() storeName?: string;
  @prop() storeCode?: string; // DHK, CHD, KML, C01
  @prop() mobile?: string;
  @prop() address?: string;
  @prop() isMain?: boolean;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<StoreDto>) {
    Object.assign(this, init);
  }
}
