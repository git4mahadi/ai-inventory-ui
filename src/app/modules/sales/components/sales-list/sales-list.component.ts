import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SaleItem } from '../../models/sale-item.model';
import { SalesService } from '../../services/sales.service';

@Component({
  selector: 'app-sales-list',
  standalone: false,
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit, OnDestroy {
  sales: SaleItem[] = [];
  private subscription?: Subscription;

  constructor(private readonly salesService: SalesService) {}

  ngOnInit(): void {
    this.subscription = this.salesService.sales$.subscribe((sales) => {
      this.sales = sales;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  getTotal(sale: SaleItem): number {
    return this.salesService.getTotal(sale);
  }

  getGrandTotal(): number {
    return this.sales.reduce((sum, sale) => sum + this.getTotal(sale), 0);
  }
}
