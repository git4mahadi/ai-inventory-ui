export class IncomeStatementReportDto {
  invoiceId?: string;
  invoiceNcId?: string;
  invoiceDate?: string;
  customerName?: string;
  totalSales?: number;
  totalCollection?: number;
  totalPaid?: number;
  totalDue?: number;
  totalReturn?: number;
}
