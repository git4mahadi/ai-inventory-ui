import { Component, OnInit } from '@angular/core';
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
} from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  IDatasource,
  IGetRowsParams,
  PaginationNumberFormatterParams,
  RowSelectedEvent,
  RowSelectionOptions,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { InvoiceDueCollectionDto } from '../../../models/dto/InvoiceDueCollectionDto';
import { invoiceStatusLabel } from '../../../models/enums/InvoiceStatus';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  paymentMethodLabel,
} from '../../../models/enums/SalesStatus';
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
  selector: 'app-due-collection',
  standalone: false,
  templateUrl: './due-collection.component.html',
  styleUrl: './due-collection.component.scss',
})
export class DueCollectionComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly collectForm: FormGroup;
  readonly customerTypeahead$ = new Subject<string>();
  readonly paymentMethods = PAYMENT_METHODS;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly rowSelection: RowSelectionOptions = {
    mode: 'multiRow',
    checkboxes: true,
    headerCheckbox: true,
    enableClickSelection: false,
  };
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
      flex: 0.85,
      minWidth: 110,
      cellClass: 'cell-mono due-amount',
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

  storeOptions: StoreResponse[] = [];
  customerOptions: CustomerResponse[] = [];

  loading = false;
  loadingCustomers = false;
  collecting = false;
  confirmOpen = false;
  hasLoaded = false;
  selectedCount = 0;
  selectedDueTotal = 0;

  private gridApi?: GridApi<InvoiceResponse>;
  private readonly selectedInvoices = new Map<string, InvoiceResponse>();
  private restoringSelection = false;
  private conflictToast?: string;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly invoiceApi: InvoiceApiService,
    private readonly storeApi: StoreApiService,
    private readonly customerApi: CustomerApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      invoiceNcId: [''],
      storeId: [null as string | null],
      customerId: [null as string | null],
    });
    this.collectForm = this.formBuilder.group({
      paymentDate: [new Date(), Validators.required],
      paymentMethod: ['CASH' as PaymentMethod, Validators.required],
      remarks: [''],
    });
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupCustomerTypeahead();
  }

  getRowId = (params: GetRowIdParams<InvoiceResponse>): string => params.data?.id ?? '';

  get confirmMessage(): string {
    const countLabel = this.selectedCount === 1 ? '1 invoice' : `${this.selectedCount} invoices`;
    return `Collect ${formatToBdNumberingSystem(this.selectedDueTotal, 2)} against ${countLabel}?`;
  }

  get confirmDetail(): string {
    const invoices = [...this.selectedInvoices.values()]
      .map((invoice) => invoice.invoiceNcId)
      .filter((ncId): ncId is string => !!ncId);
    const listed = invoices.slice(0, 6).join(', ');
    const extra = invoices.length > 6 ? ` and ${invoices.length - 6} more` : '';
    return listed
      ? `Full due of each invoice will be collected. No partial collection. ${listed}${extra}.`
      : 'Full due of each invoice will be collected. No partial collection.';
  }

  onGridReady(event: GridReadyEvent<InvoiceResponse>): void {
    this.gridApi = event.api;
  }

  onRowSelected(event: RowSelectedEvent<InvoiceResponse>): void {
    if (this.restoringSelection) {
      return;
    }
    const row = event.data;
    if (!row?.id) {
      return;
    }
    if (event.node.isSelected()) {
      const conflict = this.selectionConflict(row);
      if (conflict) {
        this.queueConflict(conflict);
        this.restoringSelection = true;
        event.node.setSelected(false, false);
        this.restoringSelection = false;
        return;
      }
      this.selectedInvoices.set(row.id, row);
    } else {
      this.selectedInvoices.delete(row.id);
    }
    this.refreshSelectionSummary();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  customerLabel(customer: CustomerResponse): string {
    const name = customer.customerName || customer.id || '';
    return customer.mobile ? `${name} (${customer.mobile})` : name;
  }

  paymentLabel(method: PaymentMethod): string {
    return paymentMethodLabel(method);
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
    if (!row.customerId) {
      return 'Walk-in';
    }
    const customer = this.customerOptions.find((option) => option.id === row.customerId);
    return customer ? this.customerLabel(customer) : '—';
  }

  onSearch(): void {
    this.clearSelection();
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      invoiceNcId: '',
      storeId: null,
      customerId: null,
    });
    this.clearSelection();
    this.reloadGrid();
  }

  onCollect(): void {
    if (this.selectedCount === 0) {
      this.toastr.warning('Select at least one due invoice.');
      return;
    }
    if (this.collectForm.invalid) {
      this.collectForm.markAllAsTouched();
      this.toastr.warning('Payment date and method are required.');
      return;
    }
    this.confirmOpen = true;
  }

  confirmCollect(): void {
    const selected = [...this.selectedInvoices.values()];
    const first = selected[0];
    if (!first || selected.length === 0) {
      this.confirmOpen = false;
      return;
    }

    const paymentDate = toApiDate(this.collectForm.value.paymentDate);
    if (!paymentDate) {
      this.toastr.warning('Payment date is required.');
      return;
    }

    this.collecting = true;
    const request = new InvoiceDueCollectionDto({
      invoiceIds: selected.map((invoice) => invoice.id).filter((id): id is string => !!id),
      paymentDate,
      paymentMethod: this.collectForm.value.paymentMethod,
      remarks: this.collectForm.value.remarks?.trim() || undefined,
      storeId: first.storeId,
      customerId: first.customerId,
    });

    this.invoiceApi
      .collectDue(request)
      .pipe(
        finalize(() => {
          this.collecting = false;
        }),
      )
      .subscribe({
        next: (payment) => {
          const amount = formatToBdNumberingSystem(payment.amount ?? this.selectedDueTotal, 2);
          this.toastr.success(`Collected ${amount} against ${selected.length} invoice(s).`);
          this.confirmOpen = false;
          this.collectForm.patchValue({ remarks: '' });
          this.clearSelection();
          this.reloadGrid();
        },
      });
  }

  cancelCollect(): void {
    if (this.collecting) {
      return;
    }
    this.confirmOpen = false;
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
      type: 'SALES',
      dueOnly: true,
      invoiceStatusList: ['POSTED', 'PARTIALLY_PAID'],
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
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          this.ensureCustomerOptions(rows);
          params.successCallback(rows, this.totalElements);
          this.restoreSelection();
        },
        error: () => {
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
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private restoreSelection(): void {
    if (!this.gridApi || this.selectedInvoices.size === 0) {
      return;
    }
    this.restoringSelection = true;
    this.gridApi.forEachNode((node) => {
      const id = node.data?.id;
      if (id && this.selectedInvoices.has(id)) {
        node.setSelected(true, false);
      }
    });
    this.restoringSelection = false;
  }

  private clearSelection(): void {
    this.selectedInvoices.clear();
    this.refreshSelectionSummary();
    this.restoringSelection = true;
    this.gridApi?.deselectAll();
    this.restoringSelection = false;
  }

  private refreshSelectionSummary(): void {
    this.selectedCount = this.selectedInvoices.size;
    this.selectedDueTotal = [...this.selectedInvoices.values()].reduce(
      (sum, invoice) => sum + (invoice.dueAmount ?? 0),
      0,
    );
  }

  private selectionConflict(row: InvoiceResponse): string | null {
    if (this.selectedInvoices.size === 0) {
      return null;
    }
    const first = this.selectedInvoices.values().next().value as InvoiceResponse | undefined;
    if (!first) {
      return null;
    }
    if ((first.storeId ?? null) !== (row.storeId ?? null)) {
      return 'Select due invoices from the same store.';
    }
    if ((first.customerId ?? null) !== (row.customerId ?? null)) {
      return 'Select due invoices from the same customer.';
    }
    return null;
  }

  private queueConflict(message: string): void {
    this.conflictToast = message;
    queueMicrotask(() => {
      if (this.conflictToast) {
        this.toastr.warning(this.conflictToast);
        this.conflictToast = undefined;
      }
    });
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
