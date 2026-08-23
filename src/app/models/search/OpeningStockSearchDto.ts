import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class OpeningStockSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() openingStockNcId?: string;
  @prop() challanNo?: string;
  @prop() challanDate?: string;
  @prop() financialYearId?: string;
  @prop() storeId?: string;

  public constructor(init?: Partial<OpeningStockSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
