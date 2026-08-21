import { prop } from '@rxweb/reactive-form-validators';

export class FinancialYearDto {
  @prop() fyCode?: string; // e.g. FY2025-26
  @prop() startDate?: string;
  @prop() endDate?: string;
  @prop() isCurrent?: boolean;
  @prop() description?: string;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<FinancialYearDto>) {
    Object.assign(this, init);
  }
}
