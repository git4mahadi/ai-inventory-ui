import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IGetRowsParams,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import {
  PURCHASE_ORDER_STATUSES,
  isPurchaseOrderEditable,
  purchaseOrderStatusLabel,
} from '../../../models/enums/PurchaseOrderStatus';
import { PurchaseOrderResponse } from '../../../models/response/PurchaseOrderResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { PurchaseOrderSearchDto } from '../../../models/search/PurchaseOrderSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { PurchaseOrderApiService } from '../../../services/PurchaseOrderApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-purchase-order-list',
  standalone: false,
  templateUrl: './purchase-order-list.component.html',
  styleUrl: './purchase-order-list.component.scss',
})
export class PurchaseOrderListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly supplierTypeahead$ = new Subject<string>();
  readonly statusOptions = PURCHASE_ORDER_STATUSES;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<PurchaseOrderResponse>[] = [
    {
      field: 'orderNcId',
      headerName: 'NC ID',
      flex: 1,
      minWidth: 145,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'orderDate',
      headerName: 'Date',
      flex: 0.85,
      minWidth: 115,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data ? toDisplayDate(params.data.orderDate) || '—' : '—',
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.3,
      minWidth: 170,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data.storeId) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data.storeId) : '—',
    },
    {
      colId: 'supplier',
      headerName: 'Supplier',
      flex: 1.3,
      minWidth: 170,
      cellClass: 'cell-muted',
      valueGetter: (params) =>
        params.data ? this.supplierName(params.data.supplierId) : '—',
      tooltipValueGetter: (params) =>
        params.data ? this.supplierName(params.data.supplierId) : '—',
    },
    {
      field: 'orderStatus',
      headerName: 'Status',
      flex: 1,
      minWidth: 140,
      valueFormatter: (params) => purchaseOrderStatusLabel(params.value),
    },
    {
      field: 'grandTotal',
      headerName: 'Grand total',
      flex: 0.9,
      minWidth: 120,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        params.value == null || params.value === ''
          ? '—'
          : formatToBdNumberingSystem(Number(params.value)),
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      width: 102,
      minWidth: 102,
      maxWidth: 102,
      cellClass: 'col-actions',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<PurchaseOrderResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getPurchaseOrderRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<PurchaseOrderResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  purchaseOrders: PurchaseOrderResponse[] = [];
  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];

  loading = false;
  loadingSuppliers = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: PurchaseOrderResponse | null = null;
  private gridApi?: GridApi<PurchaseOrderResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeId: [null as string | null],
      supplierId: [null as string | null],
      orderStatus: [null as string | null],
      orderDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupSupplierTypeahead();
  }

  onGridReady(event: GridReadyEvent<PurchaseOrderResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<PurchaseOrderResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/purchase-orders/edit', event.data.id]);
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the purchase order and all line items.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.orderNcId || this.pendingDelete?.id || '';
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  supplierLabel(supplier: SupplierResponse): string {
    return supplier.supplierName || supplier.id || '';
  }

  statusLabel(status: string): string {
    return purchaseOrderStatusLabel(status);
  }

  storeName(storeId?: string): string {
    if (!storeId) {
      return '—';
    }
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '—';
  }

  supplierName(supplierId?: string): string {
    if (!supplierId) {
      return '—';
    }
    const supplier = this.supplierOptions.find((option) => option.id === supplierId);
    return supplier ? this.supplierLabel(supplier) : '—';
  }

  private getPurchaseOrderRows(params: IGetRowsParams<PurchaseOrderResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new PurchaseOrderSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      supplierId: formValue.supplierId || undefined,
      orderStatus: formValue.orderStatus || undefined,
      orderDate: toApiDate(formValue.orderDate),
      page: pageNumber,
      size: pageSize,
    });

    this.purchaseOrderApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<PurchaseOrderResponse>(result);
          const rows = [...(page.content ?? [])];
          this.purchaseOrders = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          this.ensureSupplierOptions(rows);
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.purchaseOrders = [];
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
      supplierId: null,
      orderStatus: null,
      orderDate: null,
    });
    this.reloadGrid();
  }

  requestDelete(row: PurchaseOrderResponse): void {
    if (!row.id || this.deletingId || !isPurchaseOrderEditable(row.orderStatus)) {
      return;
    }
    this.pendingDelete = row;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const row = this.pendingDelete;
    if (!row?.id) {
      return;
    }

    this.deletingId = row.id;
    this.gridApi?.refreshCells({
      rowNodes: this.gridApi
        .getRenderedNodes()
        .filter((rowNode) => rowNode.data?.id === row.id),
      columns: ['actions'],
      force: true,
    });
    this.purchaseOrderApi
      .deletePurchaseOrder(row.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.gridApi?.refreshCells({
            columns: ['actions'],
            force: true,
          });
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Purchase order deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.purchaseOrders = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private renderActionsCell(row: PurchaseOrderResponse | undefined): string {
    if (!row) {
      return '';
    }

    const canMutate = isPurchaseOrderEditable(row.orderStatus);
    const deleteContent =
      this.deletingId === row.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit purchase order">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="${canMutate ? 'Delete' : 'Only submitted orders can be deleted'}" aria-label="Delete purchase order"${!canMutate || this.deletingId === row.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }

  private loadStores(): void {
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .subscribe((stores) => {
        this.storeOptions = stores ?? [];
        this.gridApi?.refreshCells({
          columns: ['store'],
          force: true,
        });
      });
  }

  private setupSupplierTypeahead(): void {
    this.supplierTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchSuppliers(term)),
      )
      .subscribe((suppliers) => {
        this.supplierOptions = this.mergeOptions(this.selectedSupplierOptions(), suppliers);
      });
  }

  private searchSuppliers(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.selectedSupplierOptions());
    }

    this.loadingSuppliers = true;
    return this.supplierApi
      .searchTerm(
        new SupplierSearchDto({
          searchTerm,
          enabled: true,
        }),
      )
      .pipe(
        map((suppliers) => suppliers ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingSuppliers = false)),
      );
  }

  private selectedSupplierOptions(): SupplierResponse[] {
    const selectedId = this.searchForm.get('supplierId')?.value as string | null;
    return this.supplierOptions.filter(
      (supplier) => supplier.id && supplier.id === selectedId,
    );
  }

  private ensureSupplierOptions(rows: PurchaseOrderResponse[]): void {
    const missingIds = [
      ...new Set(
        rows
          .map((row) => row.supplierId)
          .filter((id): id is string => !!id)
          .filter((id) => !this.supplierOptions.some((option) => option.id === id)),
      ),
    ];

    for (const supplierId of missingIds) {
      this.supplierApi.getSupplierById(supplierId).subscribe({
        next: (supplier) => {
          if (!supplier?.id) {
            return;
          }
          this.supplierOptions = this.mergeOptions(this.supplierOptions, [supplier]);
          this.gridApi?.refreshCells({
            columns: ['supplier'],
            force: true,
          });
        },
      });
    }
  }

  private mergeOptions<T extends { id?: string }>(kept: T[], incoming: T[]): T[] {
    const map = new Map<string, T>();
    for (const option of [...kept, ...incoming]) {
      if (option.id) {
        map.set(option.id, option);
      }
    }
    return [...map.values()];
  }
}
