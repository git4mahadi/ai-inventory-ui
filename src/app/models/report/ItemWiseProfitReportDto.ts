export class ItemWiseProfitReportDto {
  salesDate?: string;
  salesDateFormatted?: string;
  itemId?: string;
  itemName?: string;
  totalSalesPrice?: number;
  totalPurchasePrice?: number;
  totalDiscountAmount?: number;
  netProfit?: number;
}
