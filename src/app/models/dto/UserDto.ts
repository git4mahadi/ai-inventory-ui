import { prop } from '@rxweb/reactive-form-validators';

export class UserDto {
  @prop() username?: string;
  @prop() fullName?: string;
  @prop() password?: string;
  @prop() authority?: string;
  @prop() isAccountExpired?: boolean;
  @prop() isAccountLocked?: boolean;
  @prop() isCredentialExpired?: boolean;
  @prop() isAccountEnabled?: boolean;
  @prop() groupIds?: string[];
  @prop() roles?: string[];

  public constructor(init?: Partial<UserDto>) {
    Object.assign(this, init);
  }
}
