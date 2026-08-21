import { SearchDto } from '../../core/models/SearchDto';
import { prop } from '@rxweb/reactive-form-validators';

export class StoreSearchDto extends SearchDto {
  @prop() id?: string;
  @prop() storeName?: string;
  @prop() storeCode?: string;
  @prop() mobile?: string;
  @prop() address?: string;
  @prop() isMain?: boolean;
  @prop() createdById?: string;

  public constructor(init?: Partial<StoreSearchDto>) {
    super();
    Object.assign(this, init);
  }
}
