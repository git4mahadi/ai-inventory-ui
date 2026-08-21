import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class CustomerSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() customerName?: string;
  @prop() mobile?: string;
  @prop() email?: string;
  @prop() address?: string;
  @prop() createdById?: string;
  public constructor(init?: Partial<CustomerSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
