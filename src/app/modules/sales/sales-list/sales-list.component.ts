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
  SALES_STATUSES,
  isSalesEditable,
  salesStatusLabel,
} from '../../../models/enums/SalesStatus';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { SalesResponse } from '../../../models/response/SalesResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { CustomerSearchDto } from '../../../models/search/CustomerSearchDto';
import { SalesSearchDto } from '../../../models/search/SalesSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { CustomerApiService } from '../../../services/CustomerApiService';
import { SalesApiService } from '../../../services/SalesApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { appGridDefaultColDef, appGridTheme } from '../../../shared/utils/ag-grid.util';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-sales-list',
  standalone: false,
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly customerTypeahead$ = new Subject<string>();
  readonly statusOptions = SALES_STATUSES;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<SalesResponse>[] = [
    {
      field: 'invoiceNcId',
      headerName: 'Invoice',
      flex: 1,
      minWidth: 145,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'salesDate',
      headerName: 'Date',
      flex: 0.85,
      minWidth: 115,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data ? toDisplayDate(params.data.salesDate) || '—' : '—',
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data) : '—',
    },
    {
      colId: 'customer',
      headerName: 'Customer',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.customerName(params.data) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.customerName(params.data) : '—',
    },
    {
      field: 'salesStatus',
      headerName: 'Status',
      flex: 0.9,
      minWidth: 120,
      valueFormatter: (params) => salesStatusLabel(params.value),
    },
    {
      field: 'totalAmount',
      headerName: 'Total',
      flex: 0.85,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        params.value == null ? '—' : formatToBdNumberingSystem(params.value, 2),
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      width: 132,
      minWidth: 132,
      maxWidth: 132,
      cellClass: 'col-actions',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<SalesResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getSalesRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<SalesResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  sales: SalesResponse[] = [];
  storeOptions: StoreResponse[] = [];
  customerOptions: CustomerResponse[] = [];

  loading = false;
  loadingCustomers = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: SalesResponse | null = null;
  private gridApi?: GridApi<SalesResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly salesApi: SalesApiService,
    private readonly storeApi: StoreApiService,
    private readonly customerApi: CustomerApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeId: [null as string | null],
      customerId: [null as string | null],
      salesStatus: [null as string | null],
      salesDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupCustomerTypeahead();
  }

  onGridReady(event: GridReadyEvent<SalesResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<SalesResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/sales/edit', event.data.id]);
    } else if (action === 'print' && event.data.id) {
      void this.router.navigate(['/sales/slip', event.data.id], { queryParams: { print: '1' } });
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the sale and restore stock.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.invoiceNcId || this.pendingDelete?.id || '';
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  customerLabel(customer: CustomerResponse): string {
    const name = customer.customerName || customer.id || '';
    return customer.mobile ? `${name} (${customer.mobile})` : name;
  }

  statusLabel(status: string): string {
    return salesStatusLabel(status);
  }

  storeName(row: SalesResponse): string {
    if (row.storeName) {
      return row.storeName;
    }
    if (!row.storeId) {
      return '—';
    }
    const store = this.storeOptions.find((option) => option.id === row.storeId);
    return store ? this.storeLabel(store) : '—';
  }

  customerName(row: SalesResponse): string {
    if (row.customerName) {
      return row.customerName;
    }
    if (!row.customerId) {
      return 'Walk-in';
    }
    const customer = this.customerOptions.find((option) => option.id === row.customerId);
    return customer ? this.customerLabel(customer) : '—';
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      storeId: null,
      customerId: null,
      salesStatus: null,
      salesDate: null,
    });
    this.reloadGrid();
  }

  requestDelete(row: SalesResponse): void {
    if (!row.id || this.deletingId || !isSalesEditable(row.salesStatus)) {
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
    this.salesApi
      .deleteSales(row.id)
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
          this.toastr.success('Sale deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private getSalesRows(params: IGetRowsParams<SalesResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new SalesSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      customerId: formValue.customerId || undefined,
      salesStatus: formValue.salesStatus || undefined,
      salesDate: toApiDate(formValue.salesDate),
      page: pageNumber,
      size: pageSize,
    });

    this.salesApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<SalesResponse>(result);
          const rows = [...(page.content ?? [])];
          this.sales = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          this.ensureCustomerOptions(rows);
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.sales = [];
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
    this.sales = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private renderActionsCell(row: SalesResponse | undefined): string {
    if (!row) {
      return '';
    }

    const canMutate = isSalesEditable(row.salesStatus);
    const deleteContent =
      this.deletingId === row.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-print" data-action="print" title="Print slip" aria-label="Print POS slip">
          <img src="/assets/svg/icon-print.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit sale">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="${canMutate ? 'Delete' : 'Only pending sales can be deleted'}" aria-label="Delete sale"${!canMutate || this.deletingId === row.id ? ' disabled' : ''}>
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

  private setupCustomerTypeahead(): void {
    this.customerTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchCustomers(term)),
      )
      .subscribe((customers) => {
        this.customerOptions = this.mergeOptions(this.selectedCustomerOptions(), customers);
      });
  }

  private searchCustomers(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.selectedCustomerOptions());
    }

    this.loadingCustomers = true;
    return this.customerApi
      .searchTerm(
        new CustomerSearchDto({
          searchTerm,
          enabled: true,
        }),
      )
      .pipe(
        map((customers) => customers ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingCustomers = false)),
      );
  }

  private selectedCustomerOptions(): CustomerResponse[] {
    const selectedId = this.searchForm.get('customerId')?.value as string | null;
    return this.customerOptions.filter(
      (customer) => customer.id && customer.id === selectedId,
    );
  }

  private ensureCustomerOptions(rows: SalesResponse[]): void {
    const missingIds = [
      ...new Set(
        rows
          .map((row) => row.customerId)
          .filter((id): id is string => !!id)
          .filter((id) => !this.customerOptions.some((option) => option.id === id)),
      ),
    ];

    for (const customerId of missingIds) {
      this.customerApi.getCustomerById(customerId).subscribe({
        next: (customer) => {
          if (!customer?.id) {
            return;
          }
          this.customerOptions = this.mergeOptions(this.customerOptions, [customer]);
          this.gridApi?.refreshCells({
            columns: ['customer'],
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
