import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';
import { PaymentMethod, SalesStatus } from '../enums/SalesStatus';

export class SalesSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() ids?: string[];
  @prop() invoiceNcId?: string;
  @prop() invoiceNcIds?: string[];
  @prop() salesDate?: string;
  @prop() storeId?: string;
  @prop() storeIds?: string[];
  @prop() customerId?: string;
  @prop() customerIds?: string[];
  @prop() financialYearId?: string;
  @prop() financialYearIds?: string[];
  @prop() paymentMethod?: PaymentMethod;
  @prop() paymentMethodList?: PaymentMethod[];
  @prop() salesStatus?: SalesStatus;
  @prop() salesStatusList?: SalesStatus[];

  public constructor(init?: Partial<SalesSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
