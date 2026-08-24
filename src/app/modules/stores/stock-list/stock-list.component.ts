import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
import { normalizePage } from '../../../core/utils/api-response.util';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { StockMainResponse } from '../../../models/response/StockMainResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StockMainSearchDto } from '../../../models/search/StockMainSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { StockApiService } from '../../../services/StockApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-stock-list',
  standalone: false,
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent implements OnInit, OnDestroy {
  readonly searchForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();

  stocks: StockMainResponse[] = [];
  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];

  loading = false;
  loadingStores = false;
  loadingItems = false;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly stockApi: StockApiService,
    private readonly storeApi: StoreApiService,
    private readonly itemApi: ItemApiService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeId: [null as string | null],
      itemId: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.setupItemTypeahead();
    this.loadStores();
    this.loadStocks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.stocks.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  availableQty(row: StockMainResponse): number {
    return Number(row.currentQty ?? 0) - Number(row.reservedQty ?? 0);
  }

  loadStocks(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new StockMainSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      itemId: formValue.itemId || undefined,
      page: this.page,
      size: this.size,
    });

    this.stockApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<StockMainResponse>(result);
          this.stocks = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.stocks.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.stocks = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadStocks();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      storeId: null,
      itemId: null,
    });
    this.itemOptions = [];
    this.page = 0;
    this.loadStocks();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadStocks();
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
      });
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
    const itemId = this.searchForm.get('itemId')?.value as string | null;
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
}
