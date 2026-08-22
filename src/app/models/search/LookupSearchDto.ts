import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class LookupSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() lookupEnumKey?: string;
  @prop() lookupEnumValue?: string;
  @prop() lookupName?: string;
  @prop() lookupShortName?: string;
  @prop() description?: string;
  @prop() parentId?: string;

  public constructor(init?: Partial<LookupSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
