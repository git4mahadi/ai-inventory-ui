import { prop } from '@rxweb/reactive-form-validators';
import { OpeningStockItemDto } from './OpeningStockItemDto';

export class OpeningStockDto {
  @prop() challanNo?: string;
  @prop() challanDate?: string;
  @prop() financialYearId?: string;
  @prop() storeId?: string;
  @prop() items?: OpeningStockItemDto[];

  public constructor(init?: Partial<OpeningStockDto>) {
    Object.assign(this, init);
  }
}
