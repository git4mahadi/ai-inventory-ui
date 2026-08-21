import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CreateSalePayload, SaleItem } from '../models/sale-item.model';

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly storageKey = 'ai-inventory-sales';
  private readonly salesSubject = new BehaviorSubject<SaleItem[]>(
    this.readStoredSales(),
  );

  readonly sales$: Observable<SaleItem[]> = this.salesSubject.asObservable();

  getSales(): SaleItem[] {
    return this.salesSubject.value;
  }

  addSale(payload: CreateSalePayload): SaleItem {
    const sale: SaleItem = {
      id: crypto.randomUUID(),
      itemName: payload.itemName.trim(),
      quantity: payload.quantity,
      unitPrice: payload.unitPrice,
      customerName: payload.customerName.trim(),
      notes: payload.notes?.trim() || undefined,
      soldAt: payload.soldAt || new Date().toISOString(),
    };

    const next = [sale, ...this.salesSubject.value];
    this.persist(next);
    return sale;
  }

  getTotal(sale: SaleItem): number {
    return sale.quantity * sale.unitPrice;
  }

  private persist(sales: SaleItem[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(sales));
    this.salesSubject.next(sales);
  }

  private readStoredSales(): SaleItem[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as SaleItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      localStorage.removeItem(this.storageKey);
      return [];
    }
  }
}
