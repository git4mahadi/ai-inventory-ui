import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
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
import {
  ColDef,
  GridApi,
  GridReadyEvent,
  IDatasource,
  IGetRowsParams,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { toDisplayDate } from '../../../core/utils/date.util';
import { invoiceStatusLabel } from '../../../models/enums/InvoiceStatus';
import { invoiceTypeLabel } from '../../../models/enums/InvoiceType';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { InvoiceResponse } from '../../../models/response/InvoiceResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { CustomerSearchDto } from '../../../models/search/CustomerSearchDto';
import { InvoiceSearchDto } from '../../../models/search/InvoiceSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { CustomerApiService } from '../../../services/CustomerApiService';
import { InvoiceApiService } from '../../../services/InvoiceApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import {
  appGridDefaultColDef,
  appGridModules,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-invoice-list',
  standalone: false,
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.scss',
})
export class InvoiceListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly customerTypeahead$ = new Subject<string>();
  readonly columnDefs: ColDef<InvoiceResponse>[] = [
    {
      field: 'invoiceNcId',
      headerName: 'Invoice no',
      flex: 1,
      minWidth: 150,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'invoiceDate',
      headerName: 'Date',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueGetter: (params) =>
        params.data ? toDisplayDate(params.data.invoiceDate) || '—' : '—',
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 0.75,
      minWidth: 100,
      valueFormatter: (params) => invoiceTypeLabel(params.value),
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.15,
      minWidth: 150,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data) : '—',
    },
    {
      colId: 'customer',
      headerName: 'Customer',
      flex: 1.15,
      minWidth: 150,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.customerName(params.data) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.customerName(params.data) : '—',
    },
    {
      field: 'invoiceStatus',
      headerName: 'Status',
      flex: 0.95,
      minWidth: 125,
      valueFormatter: (params) => invoiceStatusLabel(params.value),
    },
    {
      field: 'grandTotal',
      headerName: 'Total',
      flex: 0.8,
      minWidth: 105,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        params.value == null ? '—' : formatToBdNumberingSystem(params.value, 2),
    },
    {
      field: 'paidAmount',
      headerName: 'Paid',
      flex: 0.75,
      minWidth: 100,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        params.value == null ? '—' : formatToBdNumberingSystem(params.value, 2),
    },
    {
      field: 'dueAmount',
      headerName: 'Due',
      flex: 0.75,
      minWidth: 100,
      cellClass: 'cell-mono',
      valueFormatter: (params) =>
        params.value == null ? '—' : formatToBdNumberingSystem(params.value, 2),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getInvoiceRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<InvoiceResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  invoices: InvoiceResponse[] = [];
  storeOptions: StoreResponse[] = [];
  customerOptions: CustomerResponse[] = [];

  loading = false;
  loadingCustomers = false;
  hasLoaded = false;
  private gridApi?: GridApi<InvoiceResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly invoiceApi: InvoiceApiService,
    private readonly storeApi: StoreApiService,
    private readonly customerApi: CustomerApiService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      invoiceNcId: [''],
      storeId: [null as string | null],
      customerId: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupCustomerTypeahead();
  }

  onGridReady(event: GridReadyEvent<InvoiceResponse>): void {
    this.gridApi = event.api;
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  customerLabel(customer: CustomerResponse): string {
    const name = customer.customerName || customer.id || '';
    return customer.mobile ? `${name} (${customer.mobile})` : name;
  }

  storeName(row: InvoiceResponse): string {
    if (row.storeName) {
      return row.storeName;
    }
    if (!row.storeId) {
      return '—';
    }
    const store = this.storeOptions.find((option) => option.id === row.storeId);
    return store ? this.storeLabel(store) : '—';
  }

  customerName(row: InvoiceResponse): string {
    if (row.customerName) {
      return row.customerName;
    }
    if (row.supplierName && !row.customerId) {
      return row.supplierName;
    }
    if (!row.customerId) {
      return '—';
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
      invoiceNcId: '',
      storeId: null,
      customerId: null,
    });
    this.reloadGrid();
  }

  private getInvoiceRows(params: IGetRowsParams<InvoiceResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new InvoiceSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      invoiceNcId: formValue.invoiceNcId?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      customerId: formValue.customerId || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.invoiceApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<InvoiceResponse>(result);
          const rows = [...(page.content ?? [])];
          this.invoices = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          this.ensureCustomerOptions(rows);
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.invoices = [];
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
    this.invoices = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
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

  private ensureCustomerOptions(rows: InvoiceResponse[]): void {
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
