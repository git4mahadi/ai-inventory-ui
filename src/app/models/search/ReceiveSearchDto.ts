import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';
import { ItemReceiveStatus } from '../enums/ItemReceiveStatus';

export class ReceiveSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() ids?: string[];
  @prop() receiveNcId?: string;
  @prop() receiveNcIds?: string[];
  @prop() receiveDate?: string;
  @prop() purchaseOrderId?: string;
  @prop() purchaseOrderIds?: string[];
  @prop() storeId?: string;
  @prop() storeIds?: string[];
  @prop() supplierId?: string;
  @prop() supplierIds?: string[];
  @prop() receiveStatus?: ItemReceiveStatus;
  @prop() receiveStatusList?: ItemReceiveStatus[];

  public constructor(init?: Partial<ReceiveSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
