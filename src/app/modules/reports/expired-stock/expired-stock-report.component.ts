import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { CurrentExpiredStockReportDto } from '../../../models/report/CurrentExpiredStockReportDto';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { ReportApiService } from '../../../services/ReportApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-expired-stock-report',
  standalone: false,
  templateUrl: './expired-stock-report.component.html',
  styleUrl: './expired-stock-report.component.scss',
})
export class ExpiredStockReportComponent implements OnInit, OnDestroy {
  readonly filterForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];
  rows: CurrentExpiredStockReportDto[] = [];

  loadingStores = false;
  loadingItems = false;
  loading = false;
  hasLoaded = false;
  printedOn = '';
  expireUntilLabel = '';

  private readonly destroy$ = new Subject<void>();
  private afterPrintHandler: (() => void) | null = null;
  private a4PageStyle: HTMLStyleElement | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly reportApi: ReportApiService,
    private readonly storeApi: StoreApiService,
    private readonly itemApi: ItemApiService,
    private readonly toastr: ToastrService,
  ) {
    this.filterForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      itemId: [null as string | null],
      expireUntil: [this.defaultExpireUntil(), Validators.required],
    });
  }

  get storeName(): string {
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '';
  }

  get itemName(): string {
    const itemId = this.filterForm.get('itemId')?.value as string | null;
    const item = this.itemOptions.find((option) => option.id === itemId);
    return item ? this.itemLabel(item) : 'All items';
  }

  get daysWindow(): number {
    const expireUntil = toApiDate(this.filterForm.get('expireUntil')?.value);
    const today = toApiDate(new Date());
    if (!expireUntil || !today) {
      return 0;
    }
    const until = new Date(`${expireUntil}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    return Math.round((until - now) / 86_400_000);
  }

  get totalQty(): number {
    return this.rows.reduce((sum, row) => sum + Number(row.currentQty ?? 0), 0);
  }

  get totalValue(): number {
    return this.rows.reduce((sum, row) => sum + Number(row.stockValue ?? 0), 0);
  }

  ngOnInit(): void {
    this.setupItemTypeahead();
    this.loadStores();
    this.filterForm
      .get('storeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.itemOptions = [];
        this.filterForm.patchValue({ itemId: null }, { emitEvent: false });
        this.hasLoaded = false;
        this.rows = [];
      });
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

  itemLabel(item: ItemResponse | string | null | undefined): string {
    if (!item || typeof item === 'string') {
      const found =
        typeof item === 'string'
          ? this.itemOptions.find((option) => option.id === item)
          : null;
      if (!found) {
        return typeof item === 'string' ? item : '';
      }
      return this.itemLabel(found);
    }
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  displayExpireDate(value?: string | null): string {
    return toDisplayDate(value) || '—';
  }

  daysLabel(days?: number | null): string {
    if (days == null || !Number.isFinite(days)) {
      return '—';
    }
    if (days < 0) {
      return `Expired ${Math.abs(days)}d`;
    }
    if (days === 0) {
      return 'Today';
    }
    return `${days}d`;
  }

  isExpired(row: CurrentExpiredStockReportDto): boolean {
    return Number(row.daysToExpire ?? 0) < 0;
  }

  generate(): void {
    const storeId = this.filterForm.get('storeId')?.value as string | null;
    const expireUntil = toApiDate(this.filterForm.get('expireUntil')?.value);
    if (!storeId) {
      this.toastr.error('Select a store first');
      return;
    }
    if (!expireUntil) {
      this.toastr.error('Select an expire-until date');
      return;
    }

    const itemId = this.filterForm.get('itemId')?.value as string | null;
    this.loading = true;
    this.reportApi
      .printCurrentExpiredStock(storeId, expireUntil, itemId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false)),
      )
      .subscribe((rows) => {
        this.rows = rows ?? [];
        this.hasLoaded = true;
        this.printedOn = toDisplayDate(toApiDate(new Date()));
        this.expireUntilLabel = toDisplayDate(expireUntil);
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

  private defaultExpireUntil(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
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
          this.filterForm.patchValue({ storeId: defaultStoreId }, { emitEvent: false });
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

  private setupItemTypeahead(): void {
    this.itemTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchItems(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((items) => {
        this.itemOptions = this.mergeSelectedItem(items);
      });
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 2) {
      return of(this.selectedItemOptions());
    }

    this.loadingItems = true;
    return this.itemApi
      .searchTerm(
        new ItemSearchDto({
          searchTerm,
          storeId: this.filterForm.get('storeId')?.value || undefined,
          enabled: true,
        }),
      )
      .pipe(
        map((items) => items ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingItems = false)),
      );
  }

  private selectedItemOptions(): ItemResponse[] {
    const itemId = this.filterForm.get('itemId')?.value as string | null;
    return this.itemOptions.filter((item) => item.id && item.id === itemId);
  }

  private mergeSelectedItem(incoming: ItemResponse[]): ItemResponse[] {
    const selected = this.selectedItemOptions();
    const map = new Map<string, ItemResponse>();
    for (const item of [...selected, ...incoming]) {
      if (item.id) {
        map.set(item.id, item);
      }
    }
    return [...map.values()];
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
