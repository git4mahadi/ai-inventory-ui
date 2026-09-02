import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { ItemWiseCurrentStockReportDto } from '../../../models/report/ItemWiseCurrentStockReportDto';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ReportApiService } from '../../../services/ReportApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-current-stock-report',
  standalone: false,
  templateUrl: './current-stock-report.component.html',
  styleUrl: './current-stock-report.component.scss',
})
export class CurrentStockReportComponent implements OnInit, OnDestroy {
  readonly filterForm: FormGroup;

  storeOptions: StoreResponse[] = [];
  rows: ItemWiseCurrentStockReportDto[] = [];

  loadingStores = false;
  loading = false;
  hasLoaded = false;
  printedOn = '';

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
    });
  }

  get storeName(): string {
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '';
  }

  get totalQty(): number {
    return this.rows.reduce((sum, row) => sum + Number(row.currentStock ?? 0), 0);
  }

  get totalValue(): number {
    return this.rows.reduce((sum, row) => sum + Number(row.stockValue ?? 0), 0);
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

  generate(): void {
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    if (!storeId) {
      this.toastr.error('Select a store first');
      return;
    }

    this.loading = true;
    this.reportApi
      .printItemCurrentStock(storeId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe((rows) => {
        this.rows = rows ?? [];
        this.hasLoaded = true;
        this.printedOn = toDisplayDate(toApiDate(new Date()));
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
