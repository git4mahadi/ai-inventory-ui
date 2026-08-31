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
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { StockMainResponse } from '../../../models/response/StockMainResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StockMainSearchDto } from '../../../models/search/StockMainSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { StockApiService } from '../../../services/StockApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import {
  ColDef,
  IDatasource,
  IGetRowsParams,
  GridReadyEvent,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-stock-list',
  standalone: false,
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.scss',
})
export class StockListComponent implements OnInit, OnDestroy {
  readonly searchForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();
  readonly columnDefs: ColDef<StockMainResponse>[] = [
    {
      field: 'itemName',
      headerName: 'Item',
      flex: 1.5,
      minWidth: 180,
      cellClass: 'item-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'storeName',
      headerName: 'Store',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      tooltipField: 'storeName',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'currentQty',
      headerName: 'Current qty',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        formatToBdNumberingSystem(Number(params.value ?? 0)),
    },
    {
      field: 'reservedQty',
      headerName: 'Reserved qty',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        formatToBdNumberingSystem(Number(params.value ?? 0)),
    },
    {
      colId: 'availableQty',
      headerName: 'Available',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'cell-mono available-qty',
      valueGetter: (params) =>
        params.data ? this.availableQty(params.data) : 0,
      valueFormatter: (params) =>
        formatToBdNumberingSystem(Number(params.value ?? 0)),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getStockRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<StockMainResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  stocks: StockMainResponse[] = [];
  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];

  loading = false;
  hasLoaded = false;
  loadingStores = false;
  loadingItems = false;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  private readonly destroy$ = new Subject<void>();
  private gridApi?: GridReadyEvent<StockMainResponse>['api'];

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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGridReady(event: GridReadyEvent<StockMainResponse>): void {
    this.gridApi = event.api;
    if (this.loading) {
      event.api.setGridOption('datasource', this.dataSource);
    }
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

  private getStockRows(params: IGetRowsParams<StockMainResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new StockMainSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      itemId: formValue.itemId || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.stockApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<StockMainResponse>(result);
          const rows = [...(page.content ?? [])];
          this.stocks = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.stocks = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.hasLoaded = true;
          params.failCallback();
        },
      });
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      storeId: null,
      itemId: null,
    });
    this.itemOptions = [];
    this.reloadGrid();
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.stocks = [];
    this.totalElements = 0;
    this.totalPages = 0;
    if (this.gridApi && !this.gridApi.isDestroyed()) {
      this.gridApi.refreshInfiniteCache();
      return;
    }
    this.gridApi = undefined;
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
