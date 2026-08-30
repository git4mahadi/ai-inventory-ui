import { prop } from '@rxweb/reactive-form-validators';

export class DashboardSummarySearchDto {
  @prop() startDate?: string;
  @prop() endDate?: string;
  @prop() storeId?: string;

  public constructor(init?: Partial<DashboardSummarySearchDto>) {
    Object.assign(this, init);
  }
}
