import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class SupplierSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() supplierName?: string;
  @prop() tin?: string;
  @prop() bin?: string;
  @prop() tradeLicense?: string;
  @prop() mobile?: string;
  @prop() email?: string;
  @prop() address?: string;
  @prop() contactPersonName?: string;
  @prop() contactPersonMobile?: string;
  @prop() supplierTypeEnumKey?: string;
  @prop() country?: string;
  @prop() createdById?: string;

  public constructor(init?: Partial<SupplierSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
