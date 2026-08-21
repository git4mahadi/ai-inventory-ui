export class FinancialYearResponse {
  id?: string;
  fyCode?: string; // e.g. FY2025-26
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  enabled?: boolean;
}
