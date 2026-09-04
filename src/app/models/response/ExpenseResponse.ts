export class ExpenseResponse {
  id?: string;
  expenseDate?: string;
  expenseHeadId?: string;
  expenseHeadName?: string;
  amount?: number;
  remarks?: string;
  enabled?: boolean;
  createdAt?: string;
  createdById?: string;
  lastModifiedAt?: string;
  lastModifiedById?: string | null;
}
