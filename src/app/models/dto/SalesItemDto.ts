import { prop } from '@rxweb/reactive-form-validators';

export class SalesItemDto {
  @prop() storeId?: string;
  @prop() salesId?: string;
  @prop() itemId?: string;
  @prop() quantity?: number;
  @prop() unitPrice?: number;
  @prop() discountAmount?: number;
  @prop() taxAmount?: number;
  @prop() lineTotal?: number;

  public constructor(init?: Partial<SalesItemDto>) {
    Object.assign(this, init);
  }
}
