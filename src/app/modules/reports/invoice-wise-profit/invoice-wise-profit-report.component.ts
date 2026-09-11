import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { InvoiceWiseProfitReportDto } from '../../../models/report/InvoiceWiseProfitReportDto';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ReportApiService } from '../../../services/ReportApiService';
import { StoreApiService } from '../../../services/StoreApiService';

type ColumnTotals = {
  totalSalesAmount: number;
  totalCollectionAmount: number;
  totalDiscountAmount: number;
  totalProfitAmount: number;
  totalReturnAmount: number;
  totalReturnDiscountAmount: number;
};

type ProfitLine =
  | { kind: 'row'; sl: number; data: InvoiceWiseProfitReportDto }
  | { kind: 'subtotal'; date: string; totals: ColumnTotals };

@Component({
  selector: 'app-invoice-wise-profit-report',
  standalone: false,
  templateUrl: './invoice-wise-profit-report.component.html',
  styleUrl: './invoice-wise-profit-report.component.scss',
})
export class InvoiceWiseProfitReportComponent implements OnInit, OnDestroy {
  readonly filterForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  rows: InvoiceWiseProfitReportDto[] = [];
  lines: ProfitLine[] = [];
  grandTotals: ColumnTotals = this.emptyTotals();
  reportStoreName = '';

  loadingStores = false;
  loading = false;
  hasLoaded = false;
  printedOn = '';
  startDateLabel = '';
  endDateLabel = '';

  private readonly destroy$ = new Subject<void>();
  private afterPrintHandler: (() => void) | null = null;
  private a4PageStyle: HTMLStyleElement | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly reportApi: ReportApiService,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
  ) {
    this.filterForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      startDate: [this.defaultStartDate(), Validators.required],
      endDate: [this.defaultEndDate(), Validators.required],
    });
  }

  get storeName(): string {
    if (this.reportStoreName) {
      return this.reportStoreName;
    }
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '';
  }

  ngOnInit(): void {
    this.loadStores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupPrintMode();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  displayDate(value?: string | null): string {
    return toDisplayDate(value) || '—';
  }

  rowDate(row: InvoiceWiseProfitReportDto): string {
    if (row.invoiceDateFormatted) {
      return row.invoiceDateFormatted;
    }
    return this.displayDate(row.invoiceDate);
  }

  isReturnRow(row: InvoiceWiseProfitReportDto): boolean {
    return row.totalSalesAmount == null && row.totalCollectionAmount == null;
  }

  generate(): void {
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const startDate = toApiDate(this.filterForm.get('startDate')?.value);
    const endDate = toApiDate(this.filterForm.get('endDate')?.value);
    if (!storeId) {
      this.toastr.error('Select a store first');
      return;
    }
    if (!startDate || !endDate) {
      this.toastr.error('Select start and end date');
      return;
    }
    if (startDate > endDate) {
      this.toastr.error('Start date cannot be after end date');
      return;
    }

    this.loading = true;
    this.reportApi
      .printInvoiceWiseProfit(storeId, startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe((report) => {
        this.rows = this.sortRows(report?.data ?? []);
        this.lines = this.buildLines(this.rows);
        this.grandTotals = this.sumColumns(this.rows);
        this.reportStoreName = report?.store
          ? this.storeLabel(report.store)
          : '';
        this.hasLoaded = true;
        this.printedOn = toDisplayDate(toApiDate(new Date()));
        this.startDateLabel = toDisplayDate(startDate);
        this.endDateLabel = toDisplayDate(endDate);
      });
  }

  printReport(): void {
    if (!this.hasLoaded) {
      this.toastr.error('Generate the report first');
      return;
    }
    document.body.classList.add('report-print-open');
    this.ensureA4PageStyle();
    this.removeAfterPrintListener();
    this.afterPrintHandler = () => this.cleanupPrintMode();
    window.addEventListener('afterprint', this.afterPrintHandler);
    window.print();
  }

  private buildLines(rows: InvoiceWiseProfitReportDto[]): ProfitLine[] {
    const lines: ProfitLine[] = [];
    let currentDate = '';
    let bucket: InvoiceWiseProfitReportDto[] = [];
    let sl = 0;

    const flush = () => {
      if (!bucket.length) {
        return;
      }
      for (const row of bucket) {
        sl += 1;
        lines.push({ kind: 'row', sl, data: row });
      }
      lines.push({
        kind: 'subtotal',
        date: currentDate,
        totals: this.sumColumns(bucket),
      });
      bucket = [];
    };

    for (const row of rows) {
      const date = row.invoiceDate || '';
      if (currentDate && date !== currentDate) {
        flush();
      }
      currentDate = date;
      bucket.push(row);
    }
    flush();
    return lines;
  }

  private sortRows(rows: InvoiceWiseProfitReportDto[]): InvoiceWiseProfitReportDto[] {
    return [...rows].sort((a, b) => {
      const dateCmp = (a.invoiceDate || '').localeCompare(b.invoiceDate || '');
      if (dateCmp !== 0) {
        return dateCmp;
      }
      return (a.invoiceNcId || '').localeCompare(b.invoiceNcId || '');
    });
  }

  private sumColumns(rows: InvoiceWiseProfitReportDto[]): ColumnTotals {
    return rows.reduce(
      (sum, row) => ({
        totalSalesAmount: sum.totalSalesAmount + Number(row.totalSalesAmount ?? 0),
        totalCollectionAmount: sum.totalCollectionAmount + Number(row.totalCollectionAmount ?? 0),
        totalDiscountAmount: sum.totalDiscountAmount + Number(row.totalDiscountAmount ?? 0),
        totalProfitAmount: sum.totalProfitAmount + Number(row.totalProfitAmount ?? 0),
        totalReturnAmount: sum.totalReturnAmount + Number(row.totalReturnAmount ?? 0),
        totalReturnDiscountAmount:
          sum.totalReturnDiscountAmount + Number(row.totalReturnDiscountAmount ?? 0),
      }),
      this.emptyTotals(),
    );
  }

  private emptyTotals(): ColumnTotals {
    return {
      totalSalesAmount: 0,
      totalCollectionAmount: 0,
      totalDiscountAmount: 0,
      totalProfitAmount: 0,
      totalReturnAmount: 0,
      totalReturnDiscountAmount: 0,
    };
  }

  private defaultStartDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }

  private defaultEndDate(): Date {
    return new Date();
  }

  private loadStores(): void {
    this.loadingStores = true;
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingStores = false)),
      )
      .subscribe((stores) => {
        this.storeOptions = stores ?? [];
        const defaultStoreId = this.defaultStoreId();
        if (defaultStoreId && !this.filterForm.get('storeId')?.value) {
          this.filterForm.patchValue({ storeId: defaultStoreId });
        }
      });
  }

  private defaultStoreId(): string | null {
    const mainStore = this.storeOptions.find((store) => store.isMain);
    if (mainStore?.id) {
      return mainStore.id;
    }
    return this.storeOptions.length === 1 ? this.storeOptions[0].id ?? null : null;
  }

  private ensureA4PageStyle(): void {
    if (this.a4PageStyle) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'report-a4-page';
    style.textContent = '@media print { @page { size: A4 landscape; margin: 10mm; } }';
    document.head.appendChild(style);
    this.a4PageStyle = style;
  }

  private cleanupPrintMode(): void {
    document.body.classList.remove('report-print-open');
    this.a4PageStyle?.remove();
    this.a4PageStyle = null;
    this.removeAfterPrintListener();
  }

  private removeAfterPrintListener(): void {
    if (this.afterPrintHandler) {
      window.removeEventListener('afterprint', this.afterPrintHandler);
      this.afterPrintHandler = null;
    }
  }
}
