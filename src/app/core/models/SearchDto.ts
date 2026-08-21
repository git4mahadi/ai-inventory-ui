import { prop } from '@rxweb/reactive-form-validators';

export class SearchDto {
  @prop() searchTerm?: string;
  @prop() page?: number = 0;
  @prop() size?: number = 10;
  @prop()  enabled?: boolean;
  public constructor(init?: Partial<SearchDto>) {
    Object.assign(this, init);
  }
}
