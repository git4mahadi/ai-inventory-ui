export class InvoiceWiseProfitReportDto {
  invoiceDate?: string;
  invoiceDateFormatted?: string;
  invoiceNcId?: string;
  totalSalesAmount?: number;
  totalCollectionAmount?: number;
  totalDiscountAmount?: number;
  totalProfitAmount?: number;
  totalReturnAmount?: number;
  totalReturnDiscountAmount?: number;
}
