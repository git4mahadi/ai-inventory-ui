import { prop } from '@rxweb/reactive-form-validators';

export class AuthRequest {
  @prop() username?: string;
  @prop() password?: string;
  public constructor(init?: Partial<AuthRequest>) {
    Object.assign(this, init);
  }
}
