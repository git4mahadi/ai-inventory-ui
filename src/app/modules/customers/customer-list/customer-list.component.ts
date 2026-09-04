import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
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
import { normalizeCustomer, normalizePage } from '../../../core/utils/api-response.util';
import { CustomerDto } from '../../../models/dto/CustomerDto';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { CustomerSearchDto } from '../../../models/search/CustomerSearchDto';
import { CustomerApiService } from '../../../services/CustomerApiService';
import {
  appGridDefaultColDef,
  appGridModules,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-customer-list',
  standalone: false,
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent implements OnInit {
  @ViewChild('customerFormShell') customerFormShell?: ElementRef<HTMLElement>;
  readonly customerForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly columnDefs: ColDef<CustomerResponse>[] = [
    {
      field: 'customerName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'customer-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'mobile',
      headerName: 'Mobile',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.3,
      minWidth: 180,
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'address',
      headerName: 'Address',
      flex: 1.2,
      minWidth: 180,
      cellClass: 'cell-muted',
      tooltipField: 'address',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<CustomerResponse>) =>
        this.renderEnabledCell(!!params.value),
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
      cellRenderer: (params: ICellRendererParams<CustomerResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getCustomerRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<CustomerResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  customers: CustomerResponse[] = [];
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: CustomerResponse | null = null;
  private gridApi?: GridApi<CustomerResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customerApi: CustomerApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.customerForm = this.formBuilder.group({
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      mobile: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      address: ['', [Validators.maxLength(250)]],
      enabled: [true],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      customerName: [''],
      mobile: [''],
      email: [''],
    });
  }

  get f() {
    return this.customerForm.controls;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the customer and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.customerName || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadCustomerForEdit(routeId);
    }
  }

  onGridReady(event: GridReadyEvent<CustomerResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<CustomerResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit') {
      this.startEdit(event.data);
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      customerName: '',
      mobile: '',
      email: '',
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.customerForm.invalid || this.saving) {
      return;
    }

    const value = this.customerForm.getRawValue();
    const dto = new CustomerDto({
      customerName: value.customerName?.trim(),
      mobile: value.mobile?.trim() || undefined,
      email: value.email?.trim() || undefined,
      address: value.address?.trim() || undefined,
      enabled: !!value.enabled,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.customerApi.updateCustomer(this.editingId, dto)
      : this.customerApi.createCustomer(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'Customer updated successfully' : 'Customer created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.customerForm.reset({
      customerName: '',
      mobile: '',
      email: '',
      address: '',
      enabled: true,
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/customers']);
    }
  }

  requestDelete(customer: CustomerResponse): void {
    if (!customer.id || this.deletingId) {
      return;
    }
    this.pendingDelete = customer;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const customer = this.pendingDelete;
    if (!customer?.id) {
      return;
    }

    this.deletingId = customer.id;
    this.refreshActionCells(customer.id);
    this.customerApi
      .deleteCustomer(customer.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Customer deleted successfully');
          if (this.editingId === customer.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(customer: CustomerResponse): void {
    const normalized = normalizeCustomer(customer);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.customerFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.customerApi.getCustomerById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
    });
  }

  private loadCustomerForEdit(id: string): void {
    this.customerApi.getCustomerById(id).subscribe({
      next: (customer) => this.patchFormForEdit(customer),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(customer: CustomerResponse): void {
    const normalized = normalizeCustomer(customer);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.customerForm.patchValue({
      customerName: normalized.customerName ?? '',
      mobile: normalized.mobile ?? '',
      email: normalized.email ?? '',
      address: normalized.address ?? '',
      enabled: normalized.enabled ?? true,
    });
  }

  private getCustomerRows(params: IGetRowsParams<CustomerResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new CustomerSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      customerName: formValue.customerName?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      email: formValue.email?.trim() || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.customerApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<CustomerResponse>(result);
          const rows = [...(page.content ?? [])];
          this.customers = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.customers = [];
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
    this.customers = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private refreshActionCells(customerId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: customerId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === customerId)
        : undefined,
      columns: ['actions'],
      force: true,
    });
  }

  private renderEnabledCell(enabled: boolean): string {
    const icon = enabled ? 'icon-enabled.svg' : 'icon-disabled.svg';
    const state = enabled ? 'enabled' : 'disabled';
    return `
      <span class="enabled-status is-${state}" title="${enabled ? 'Enabled' : 'Disabled'}">
        <span class="enabled-status-icon">
          <img src="/assets/svg/${icon}" alt="" width="12" height="12" />
        </span>
      </span>
    `;
  }

  private renderActionsCell(customer: CustomerResponse | undefined): string {
    if (!customer) {
      return '';
    }

    const deleteContent =
      this.deletingId === customer.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit customer">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete customer"${this.deletingId === customer.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
