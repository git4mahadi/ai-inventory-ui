import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { toDisplayDate } from '../../../core/utils/date.util';
import { paymentMethodLabel } from '../../../models/enums/SalesStatus';
import { SalesItemResponse } from '../../../models/response/SalesItemResponse';
import { SalesResponse } from '../../../models/response/SalesResponse';
import { SalesApiService } from '../../../services/SalesApiService';

@Component({
  selector: 'app-sales-slip',
  standalone: false,
  templateUrl: './sales-slip.component.html',
  styleUrl: './sales-slip.component.scss',
})
export class SalesSlipComponent implements OnInit, OnDestroy {
  sale: SalesResponse | null = null;
  loading = true;
  salesId = '';
  private autoPrint = false;
  private afterPrintHandler: (() => void) | null = null;

  constructor(
    private readonly salesApi: SalesApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  get items(): SalesItemResponse[] {
    return this.sale?.items ?? [];
  }

  get customerLabel(): string {
    if (!this.sale?.customerName) {
      return 'Walk-in';
    }
    return this.sale.customerMobile
      ? `${this.sale.customerName} (${this.sale.customerMobile})`
      : this.sale.customerName;
  }

  ngOnInit(): void {
    document.body.classList.add('pos-slip-open');
    this.autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
    this.salesId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.salesId) {
      this.toastr.error('Sale id is missing');
      void this.router.navigate(['/sales/list']);
      return;
    }
    this.loadSales();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('pos-slip-open');
    this.removeAfterPrintListener();
  }

  displayDate(value?: string | null): string {
    return toDisplayDate(value) || '—';
  }

  paymentLabel(method?: string | null): string {
    return paymentMethodLabel(method);
  }

  printSlip(): void {
    this.removeAfterPrintListener();
    this.afterPrintHandler = () => {
      this.removeAfterPrintListener();
      void this.router.navigate(['/sales/create']);
    };
    window.addEventListener('afterprint', this.afterPrintHandler);
    window.print();
  }

  private removeAfterPrintListener(): void {
    if (!this.afterPrintHandler) {
      return;
    }
    window.removeEventListener('afterprint', this.afterPrintHandler);
    this.afterPrintHandler = null;
  }

  private loadSales(): void {
    this.loading = true;
    this.salesApi
      .getSalesById(this.salesId)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (sale) => {
          this.sale = sale;
          if (this.autoPrint) {
            this.autoPrint = false;
            this.clearAutoPrintQueryParam();
            setTimeout(() => this.printSlip());
          }
        },
        error: () => void this.router.navigate(['/sales/list']),
      });
  }

  private clearAutoPrintQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { print: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
