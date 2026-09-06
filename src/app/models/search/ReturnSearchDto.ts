import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class ReturnSearchDto extends SearchDto {
  @prop() returnDateFrom?: string;
  @prop() returnDateTo?: string;
  @prop() id?: string;
  @prop() ids?: string[];
  @prop() returnNcId?: string;
  @prop() returnNcIds?: string[];
  @prop() returnDate?: string;
  @prop() returnType?: 'SALES_RETURN' | 'PURCHASE_RETURN';
  @prop() returnTypeList?: Array<'SALES_RETURN' | 'PURCHASE_RETURN'>;
  @prop() invoiceId?: string;
  @prop() invoiceIds?: string[];
  @prop() storeId?: string;
  @prop() storeIds?: string[];
  @prop() customerId?: string;
  @prop() customerIds?: string[];
  @prop() supplierId?: string;
  @prop() supplierIds?: string[];

  public constructor(init?: Partial<ReturnSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
