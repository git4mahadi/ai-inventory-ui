import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class ItemSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() itemName?: string;
  @prop() itemCode?: string;
  @prop() itemBarcode?: string;
  @prop() strength?: string;
  @prop() storeId?: string;
  @prop() supplierId?: string;
  @prop() packSizeId?: string;
  @prop() locationId?: string;
  @prop() isForeignItem?: boolean;

  public constructor(init?: Partial<ItemSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
