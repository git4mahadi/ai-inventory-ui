import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class UserSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() username?: string;
  @prop() fullName?: string;
  @prop() authority?: string;

  public constructor(init?: Partial<UserSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
