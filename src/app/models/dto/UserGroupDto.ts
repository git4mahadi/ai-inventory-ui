import { prop } from '@rxweb/reactive-form-validators';

export class UserGroupDto {
  @prop() groupName?: string;
  @prop() permissions?: string[];
  @prop() enabled?: boolean;

  public constructor(init?: Partial<UserGroupDto>) {
    Object.assign(this, init);
  }
}
