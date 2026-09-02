import { prop } from '@rxweb/reactive-form-validators';

export class ReturnItemDto {
  @prop() invoiceItemId?: string;
  @prop() itemId?: string;
  @prop() quantity?: number;
  @prop() unitPrice?: number;
  @prop() discountAmount?: number;
  @prop() vatAmount?: number;
  @prop() taxAmount?: number;
  @prop() lineTotal?: number;

  public constructor(init?: Partial<ReturnItemDto>) {
    Object.assign(this, init);
  }
}
