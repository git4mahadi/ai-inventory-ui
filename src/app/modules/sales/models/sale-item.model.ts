export interface SaleItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  customerName: string;
  soldAt: string;
  notes?: string;
}

export type CreateSalePayload = Omit<SaleItem, 'id' | 'soldAt'> & {
  soldAt?: string;
};
