import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';
import { InvoiceStatus } from '../enums/InvoiceStatus';
import { InvoiceType } from '../enums/InvoiceType';

export class InvoiceSearchDto extends SearchDto {
  @prop() invoiceDateFrom?: string;
  @prop() invoiceDateTo?: string;
  @prop() dueDateFrom?: string;
  @prop() dueDateTo?: string;
  @prop() id?: string;
  @prop() ids?: string[];
  @prop() invoiceNcId?: string;
  @prop() invoiceNcIds?: string[];
  @prop() invoiceDate?: string;
  @prop() dueDate?: string;
  @prop() type?: InvoiceType;
  @prop() typeList?: InvoiceType[];
  @prop() storeId?: string;
  @prop() storeIds?: string[];
  @prop() customerId?: string;
  @prop() customerIds?: string[];
  @prop() supplierId?: string;
  @prop() supplierIds?: string[];
  @prop() receiveId?: string;
  @prop() receiveIds?: string[];
  @prop() salesId?: string;
  @prop() salesIds?: string[];
  @prop() invoiceStatus?: InvoiceStatus;
  @prop() invoiceStatusList?: InvoiceStatus[];
  @prop() dueOnly?: boolean;

  public constructor(init?: Partial<InvoiceSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
