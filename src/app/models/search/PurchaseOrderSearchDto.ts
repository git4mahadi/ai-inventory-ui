import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';
import { PurchaseOrderStatus } from '../enums/PurchaseOrderStatus';

export class PurchaseOrderSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() ids?: string[];
  @prop() orderNcId?: string;
  @prop() orderNcIds?: string[];
  @prop() orderDate?: string;
  @prop() expectedDate?: string;
  @prop() storeId?: string;
  @prop() storeIds?: string[];
  @prop() supplierId?: string;
  @prop() supplierIds?: string[];
  @prop() orderStatus?: PurchaseOrderStatus;
  @prop() orderStatusList?: PurchaseOrderStatus[];

  public constructor(init?: Partial<PurchaseOrderSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
