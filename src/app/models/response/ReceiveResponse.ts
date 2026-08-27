import { ItemReceiveStatus } from '../enums/ItemReceiveStatus';
import { ReceiveItemResponse } from './ReceiveItemResponse';

export class ReceiveResponse {
  id?: string;
  receiveNcId?: string;
  receiveDate?: string;
  purchaseOrderId?: string;
  storeId?: string;
  supplierId?: string;
  receiveStatus?: ItemReceiveStatus;
  items?: ReceiveItemResponse[];
}
