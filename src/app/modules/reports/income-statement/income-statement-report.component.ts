import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { IncomeStatementReportDto } from '../../../models/report/IncomeStatementReportDto';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ReportApiService } from '../../../services/ReportApiService';
import { StoreApiService } from '../../../services/StoreApiService';

interface MoneyTotals {
  totalSales: number;
  totalCollection: number;
  totalPaid: number;
  totalDue: number;
  totalReturn: number;
}

type IncomeStatementLine =
  | { kind: 'row'; sl: number; data: IncomeStatementReportDto }
  | { kind: 'subtotal'; date: string; totals: MoneyTotals };

@Component({
  selector: 'app-income-statement-report',
  standalone: false,
  templateUrl: './income-statement-report.component.html',
  styleUrl: './income-statement-report.component.scss',
})
export class IncomeStatementReportComponent implements OnInit, OnDestroy {
  readonly filterForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  rows: IncomeStatementReportDto[] = [];
  lines: IncomeStatementLine[] = [];
  grandTotal: MoneyTotals = this.emptyTotals();

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
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '';
  }

  get netCollection(): number {
    return this.grandTotal.totalCollection - this.grandTotal.totalReturn;
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

  isReturnRow(row: IncomeStatementReportDto): boolean {
    return Number(row.totalReturn ?? 0) > 0 && Number(row.totalSales ?? 0) === 0;
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
      .printIncomeStatement(storeId, startDate, endDate)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe((rows) => {
        this.rows = rows ?? [];
        this.lines = this.buildLines(this.rows);
        this.grandTotal = this.sumRows(this.rows);
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

  private buildLines(rows: IncomeStatementReportDto[]): IncomeStatementLine[] {
    const lines: IncomeStatementLine[] = [];
    let currentDate = '';
    let bucket: IncomeStatementReportDto[] = [];
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
        totals: this.sumRows(bucket),
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

  private sumRows(rows: IncomeStatementReportDto[]): MoneyTotals {
    return rows.reduce(
      (sum, row) => ({
        totalSales: sum.totalSales + Number(row.totalSales ?? 0),
        totalCollection: sum.totalCollection + Number(row.totalCollection ?? 0),
        totalPaid: sum.totalPaid + Number(row.totalPaid ?? 0),
        totalDue: sum.totalDue + Number(row.totalDue ?? 0),
        totalReturn: sum.totalReturn + Number(row.totalReturn ?? 0),
      }),
      this.emptyTotals(),
    );
  }

  private emptyTotals(): MoneyTotals {
    return {
      totalSales: 0,
      totalCollection: 0,
      totalPaid: 0,
      totalDue: 0,
      totalReturn: 0,
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
    style.textContent = '@media print { @page { size: A4 portrait; margin: 10mm; } }';
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
