import { OpeningStockItemResponse } from './OpeningStockItemResponse';

export class OpeningStockResponse {
  id?: string;
  openingStockNcId?: string;
  challanNo?: string;
  challanDate?: string;
  challanDateFormatted?: string;
  financialYearId?: string;
  fyCode?: string;
  storeId?: string;
  items?: OpeningStockItemResponse[];
}
