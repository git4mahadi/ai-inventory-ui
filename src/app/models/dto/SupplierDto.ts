import { prop } from '@rxweb/reactive-form-validators';

export class SupplierDto {
  @prop() supplierName?: string;
  @prop() tin?: string;
  @prop() bin?: string;
  @prop() tradeLicense?: string;
  @prop() tradeLicenseValidTo?: string;
  @prop() mobile?: string;
  @prop() email?: string;
  @prop() address?: string;
  @prop() contactPersonName?: string;
  @prop() contactPersonMobile?: string;
  @prop() supplierTypeEnumKey?: string;
  @prop() country?: string;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<SupplierDto>) {
    Object.assign(this, init);
  }
}
