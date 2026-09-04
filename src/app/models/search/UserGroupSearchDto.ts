import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class UserGroupSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() groupName?: string;
  @prop() permissions?: string;

  public constructor(init?: Partial<UserGroupSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
