import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class ReconcileStockSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() reconcileStockNcId?: string;
  @prop() reconcileDate?: string;
  @prop() storeId?: string;

  public constructor(init?: Partial<ReconcileStockSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
