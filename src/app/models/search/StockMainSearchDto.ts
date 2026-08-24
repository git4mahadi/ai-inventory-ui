import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class StockMainSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() storeId?: string;
  @prop() itemId?: string;

  public constructor(init?: Partial<StockMainSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
