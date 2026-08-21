import { prop } from '@rxweb/reactive-form-validators';

export class CustomerDto {
  @prop() customerName?: string;
  @prop() mobile?: string;
  @prop() email?: string;
  @prop() address?: string;
  @prop() enabled?: boolean;

  public constructor(init?: Partial<CustomerDto>) {
    Object.assign(this, init);
  }
}
