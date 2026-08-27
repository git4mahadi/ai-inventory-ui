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
  AllCommunityModule,
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IGetRowsParams,
  ModuleRegistry,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import {
  ITEM_RECEIVE_STATUSES,
  isItemReceiveEditable,
  itemReceiveStatusLabel,
} from '../../../models/enums/ItemReceiveStatus';
import { PurchaseOrderResponse } from '../../../models/response/PurchaseOrderResponse';
import { ReceiveResponse } from '../../../models/response/ReceiveResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { ReceiveSearchDto } from '../../../models/search/ReceiveSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { PurchaseOrderApiService } from '../../../services/PurchaseOrderApiService';
import { ReceiveApiService } from '../../../services/ReceiveApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';
import { appGridDefaultColDef, appGridTheme } from '../../../shared/utils/ag-grid.util';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-receive-list',
  standalone: false,
  templateUrl: './receive-list.component.html',
  styleUrl: './receive-list.component.scss',
})
export class ReceiveListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly supplierTypeahead$ = new Subject<string>();
  readonly statusOptions = ITEM_RECEIVE_STATUSES;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<ReceiveResponse>[] = [
    {
      field: 'receiveNcId',
      headerName: 'NC ID',
      flex: 1,
      minWidth: 145,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'receiveDate',
      headerName: 'Date',
      flex: 0.85,
      minWidth: 115,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data ? toDisplayDate(params.data.receiveDate) || '—' : '—',
    },
    {
      colId: 'purchaseOrder',
      headerName: 'Purchase order',
      flex: 1,
      minWidth: 145,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data ? this.purchaseOrderName(params.data.purchaseOrderId) : '—',
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data.storeId) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data.storeId) : '—',
    },
    {
      colId: 'supplier',
      headerName: 'Supplier',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      valueGetter: (params) =>
        params.data ? this.supplierName(params.data.supplierId) : '—',
      tooltipValueGetter: (params) =>
        params.data ? this.supplierName(params.data.supplierId) : '—',
    },
    {
      field: 'receiveStatus',
      headerName: 'Status',
      flex: 1,
      minWidth: 130,
      valueFormatter: (params) => itemReceiveStatusLabel(params.value),
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
      cellRenderer: (params: ICellRendererParams<ReceiveResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getReceiveRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<ReceiveResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  receives: ReceiveResponse[] = [];
  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  purchaseOrderOptions: PurchaseOrderResponse[] = [];

  loading = false;
  loadingSuppliers = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: ReceiveResponse | null = null;
  private gridApi?: GridApi<ReceiveResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly receiveApi: ReceiveApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeId: [null as string | null],
      supplierId: [null as string | null],
      receiveStatus: [null as string | null],
      receiveDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupSupplierTypeahead();
  }

  onGridReady(event: GridReadyEvent<ReceiveResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<ReceiveResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/receives/edit', event.data.id]);
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the receive and all line items.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.receiveNcId || this.pendingDelete?.id || '';
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  supplierLabel(supplier: SupplierResponse): string {
    return supplier.supplierName || supplier.id || '';
  }

  statusLabel(status: string): string {
    return itemReceiveStatusLabel(status);
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

  purchaseOrderName(purchaseOrderId?: string): string {
    if (!purchaseOrderId) {
      return '—';
    }
    const order = this.purchaseOrderOptions.find((option) => option.id === purchaseOrderId);
    return order?.orderNcId || '—';
  }

  private getReceiveRows(params: IGetRowsParams<ReceiveResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new ReceiveSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      supplierId: formValue.supplierId || undefined,
      receiveStatus: formValue.receiveStatus || undefined,
      receiveDate: toApiDate(formValue.receiveDate),
      page: pageNumber,
      size: pageSize,
    });

    this.receiveApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ReceiveResponse>(result);
          const rows = [...(page.content ?? [])];
          this.receives = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          this.ensureSupplierOptions(rows);
          this.ensurePurchaseOrderOptions(rows);
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.receives = [];
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
      receiveStatus: null,
      receiveDate: null,
    });
    this.reloadGrid();
  }

  requestDelete(row: ReceiveResponse): void {
    if (!row.id || this.deletingId || !isItemReceiveEditable(row.receiveStatus)) {
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
    this.receiveApi
      .deleteReceive(row.id)
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
          this.toastr.success('Receive deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.receives = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private renderActionsCell(row: ReceiveResponse | undefined): string {
    if (!row) {
      return '';
    }

    const canMutate = isItemReceiveEditable(row.receiveStatus);
    const deleteContent =
      this.deletingId === row.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit receive">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="${canMutate ? 'Delete' : 'Only draft receives can be deleted'}" aria-label="Delete receive"${!canMutate || this.deletingId === row.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }

  private loadStores(): void {
    this.storeApi.searchList(new StoreSearchDto({ enabled: true })).subscribe((stores) => {
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

  private ensureSupplierOptions(rows: ReceiveResponse[]): void {
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

  private ensurePurchaseOrderOptions(rows: ReceiveResponse[]): void {
    const missingIds = [
      ...new Set(
        rows
          .map((row) => row.purchaseOrderId)
          .filter((id): id is string => !!id)
          .filter((id) => !this.purchaseOrderOptions.some((option) => option.id === id)),
      ),
    ];

    for (const purchaseOrderId of missingIds) {
      this.purchaseOrderApi.getPurchaseOrderById(purchaseOrderId).subscribe({
        next: (order) => {
          if (!order?.id) {
            return;
          }
          this.purchaseOrderOptions = this.mergeOptions(this.purchaseOrderOptions, [order]);
          this.gridApi?.refreshCells({
            columns: ['purchaseOrder'],
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
