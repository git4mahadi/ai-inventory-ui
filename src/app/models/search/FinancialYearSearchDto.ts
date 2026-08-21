import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class FinancialYearSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() fyCode?: string;
  @prop() startDate?: string;
  @prop() endDate?: string;
  @prop() isCurrent?: boolean;
  @prop() description?: string;
  @prop() createdById?: string;

  public constructor(init?: Partial<FinancialYearSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
