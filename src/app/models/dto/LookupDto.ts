import { prop } from '@rxweb/reactive-form-validators';

export class LookupDto {
  @prop() lookupEnumKey?: string;
  @prop() lookupEnumValue?: string;
  @prop() lookupName?: string;
  @prop() lookupShortName?: string;
  @prop() image?: string;
  @prop() parentId?: string;
  @prop() parentName?: string;
  @prop() parentFullName?: string;

  public constructor(init?: Partial<LookupDto>) {
    Object.assign(this, init);
  }
}
