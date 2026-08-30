import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
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
import { ReconcileStockResponse } from '../../../models/response/ReconcileStockResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ReconcileStockSearchDto } from '../../../models/search/ReconcileStockSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ReconcileStockApiService } from '../../../services/ReconcileStockApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { appGridDefaultColDef, appGridTheme } from '../../../shared/utils/ag-grid.util';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-reconcile-stock-list',
  standalone: false,
  templateUrl: './reconcile-stock-list.component.html',
  styleUrl: './reconcile-stock-list.component.scss',
})
export class ReconcileStockListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<ReconcileStockResponse>[] = [
    {
      field: 'reconcileStockNcId',
      headerName: 'NC ID',
      flex: 1,
      minWidth: 145,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'reconcileDate',
      headerName: 'Date',
      flex: 0.85,
      minWidth: 115,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data
          ? params.data.reconcileDateFormatted ||
            toDisplayDate(params.data.reconcileDate) ||
            '—'
          : '—',
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data) : '—',
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
      cellRenderer: (params: ICellRendererParams<ReconcileStockResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getReconcileRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<ReconcileStockResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  records: ReconcileStockResponse[] = [];
  storeOptions: StoreResponse[] = [];

  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: ReconcileStockResponse | null = null;
  viewOpen = false;
  viewLoading = false;
  viewRecord: ReconcileStockResponse | null = null;
  private gridApi?: GridApi<ReconcileStockResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly reconcileStockApi: ReconcileStockApiService,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeId: [null as string | null],
      reconcileDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.loadStores();
  }

  onGridReady(event: GridReadyEvent<ReconcileStockResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<ReconcileStockResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'view') {
      this.openView(event.data);
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the stock reconcile and all line items.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.reconcileStockNcId || this.pendingDelete?.id || '';
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  storeName(row: ReconcileStockResponse): string {
    if (row.storeName) {
      return row.storeName;
    }
    if (!row.storeId) {
      return '—';
    }
    const store = this.storeOptions.find((option) => option.id === row.storeId);
    return store ? this.storeLabel(store) : '—';
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      storeId: null,
      reconcileDate: null,
    });
    this.reloadGrid();
  }

  requestDelete(row: ReconcileStockResponse): void {
    if (!row.id || this.deletingId) {
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

  openView(row: ReconcileStockResponse): void {
    if (!row.id || this.viewLoading) {
      return;
    }

    this.viewOpen = true;
    this.viewLoading = true;
    this.viewRecord = null;
    this.reconcileStockApi
      .getReconcileStockById(row.id)
      .pipe(finalize(() => (this.viewLoading = false)))
      .subscribe({
        next: (record) => {
          this.viewRecord = record;
        },
        error: () => this.closeView(),
      });
  }

  closeView(): void {
    this.viewOpen = false;
    this.viewLoading = false;
    this.viewRecord = null;
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
    this.reconcileStockApi
      .deleteReconcileStock(row.id)
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
          this.toastr.success('Stock reconcile deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private getReconcileRows(params: IGetRowsParams<ReconcileStockResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new ReconcileStockSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      reconcileDate: toApiDate(formValue.reconcileDate),
      page: pageNumber,
      size: pageSize,
    });

    this.reconcileStockApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ReconcileStockResponse>(result);
          const rows = [...(page.content ?? [])];
          this.records = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.records = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.hasLoaded = true;
          params.failCallback();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.records = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private renderActionsCell(row: ReconcileStockResponse | undefined): string {
    if (!row) {
      return '';
    }

    const deleteContent =
      this.deletingId === row.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-view" data-action="view" title="View details" aria-label="View stock reconcile details">
          <span class="icon-graphic" aria-hidden="true"></span>
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete stock reconcile"${this.deletingId === row.id ? ' disabled' : ''}>
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
}
