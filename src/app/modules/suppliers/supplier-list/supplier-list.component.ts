import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
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
import { normalizePage, normalizeSupplier } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { SupplierDto } from '../../../models/dto/SupplierDto';
import { SupplierTypeEnum } from '../../../models/enums/SupplierTypeEnum';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { SupplierApiService } from '../../../services/SupplierApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';
import { AuthService } from '../../../core/services/auth.service';
import {
  crudAccess,
  hideActionsColumnIfNeeded,
  renderCrudActionButtons,
} from '../../../shared/utils/crud-access.util';

@Component({
  selector: 'app-supplier-list',
  standalone: false,
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
})
export class SupplierListComponent implements OnInit {
  @ViewChild('supplierFormShell') supplierFormShell?: ElementRef<HTMLElement>;
  readonly supplierForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly supplierTypes = SupplierTypeEnum.enums;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<SupplierResponse>[] = [
    {
      field: 'supplierName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'supplier-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'type',
      headerName: 'Type',
      flex: 1,
      minWidth: 125,
      valueGetter: (params) =>
        this.typeLabel(params.data?.supplierTypeEnumKey) || params.data?.supplierTypeEnumValue || '—',
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
      field: 'contactPersonName',
      headerName: 'Contact',
      flex: 1.1,
      minWidth: 150,
      cellClass: 'cell-muted',
      tooltipField: 'contactPersonName',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'country',
      headerName: 'Country',
      flex: 0.9,
      minWidth: 110,
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
      cellRenderer: (params: ICellRendererParams<SupplierResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<SupplierResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getSupplierRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<SupplierResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  suppliers: SupplierResponse[] = [];
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: SupplierResponse | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;
  private gridApi?: GridApi<SupplierResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierApi: SupplierApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
  ) {
    const access = crudAccess(this.authService, 'ROLE_SUPPLIER');
    this.canCreate = access.canCreate;
    this.canUpdate = access.canUpdate;
    this.canDelete = access.canDelete;
    hideActionsColumnIfNeeded(this.columnDefs, access);
    this.supplierForm = this.formBuilder.group({
      supplierName: ['', [Validators.required, Validators.maxLength(120)]],
      tin: ['', [Validators.maxLength(20)]],
      bin: ['', [Validators.maxLength(20)]],
      tradeLicense: ['', [Validators.maxLength(20)]],
      tradeLicenseValidTo: [null as Date | null],
      mobile: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(120)]],
      address: ['', [Validators.maxLength(255)]],
      contactPersonName: ['', [Validators.maxLength(120)]],
      contactPersonMobile: ['', [Validators.maxLength(20)]],
      supplierTypeEnumKey: [null as string | null],
      country: ['', [Validators.maxLength(120)]],
      enabled: [true],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      supplierName: [''],
      mobile: [''],
      supplierTypeEnumKey: [null as string | null],
    });
  }

  get f() {
    return this.supplierForm.controls;
  }

  get showForm(): boolean {
    return this.canCreate || (this.isEditing && this.canUpdate);
  }

  get canSave(): boolean {
    return this.isEditing ? this.canUpdate : this.canCreate;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the supplier and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.supplierName || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadSupplierForEdit(routeId);
    }
  }

  typeLabel(key?: string | null): string {
    if (!key) {
      return '';
    }
    return this.supplierTypes.find((type) => type.key === key)?.value || '';
  }

  onGridReady(event: GridReadyEvent<SupplierResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<SupplierResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && this.canUpdate) {
      this.startEdit(event.data);
    } else if (action === 'delete' && this.canDelete) {
      this.requestDelete(event.data);
    }
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      supplierName: '',
      mobile: '',
      supplierTypeEnumKey: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.supplierForm.invalid || this.saving || !this.canSave) {
      return;
    }

    const value = this.supplierForm.getRawValue();
    const dto = new SupplierDto({
      supplierName: value.supplierName?.trim(),
      tin: value.tin?.trim() || undefined,
      bin: value.bin?.trim() || undefined,
      tradeLicense: value.tradeLicense?.trim() || undefined,
      tradeLicenseValidTo: toApiDate(value.tradeLicenseValidTo),
      mobile: value.mobile?.trim() || undefined,
      email: value.email?.trim() || undefined,
      address: value.address?.trim() || undefined,
      contactPersonName: value.contactPersonName?.trim() || undefined,
      contactPersonMobile: value.contactPersonMobile?.trim() || undefined,
      supplierTypeEnumKey: value.supplierTypeEnumKey || undefined,
      country: value.country?.trim() || undefined,
      enabled: !!value.enabled,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.supplierApi.updateSupplier(this.editingId, dto)
      : this.supplierApi.createSupplier(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'Supplier updated successfully' : 'Supplier created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.supplierForm.reset({
      supplierName: '',
      tin: '',
      bin: '',
      tradeLicense: '',
      tradeLicenseValidTo: null,
      mobile: '',
      email: '',
      address: '',
      contactPersonName: '',
      contactPersonMobile: '',
      supplierTypeEnumKey: null,
      country: '',
      enabled: true,
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/suppliers']);
    }
  }

  requestDelete(supplier: SupplierResponse): void {
    if (!supplier.id || this.deletingId || !this.canDelete) {
      return;
    }
    this.pendingDelete = supplier;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const supplier = this.pendingDelete;
    if (!supplier?.id) {
      return;
    }

    this.deletingId = supplier.id;
    this.refreshActionCells(supplier.id);
    this.supplierApi
      .deleteSupplier(supplier.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Supplier deleted successfully');
          if (this.editingId === supplier.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(supplier: SupplierResponse): void {
    if (!this.canUpdate) {
      return;
    }
    const normalized = normalizeSupplier(supplier);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.supplierFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.supplierApi.getSupplierById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
    });
  }

  private loadSupplierForEdit(id: string): void {
    if (!this.canUpdate) {
      this.resetForm();
      return;
    }
    this.supplierApi.getSupplierById(id).subscribe({
      next: (supplier) => this.patchFormForEdit(supplier),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(supplier: SupplierResponse): void {
    const normalized = normalizeSupplier(supplier);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.supplierForm.patchValue({
      supplierName: normalized.supplierName ?? '',
      tin: normalized.tin ?? '',
      bin: normalized.bin ?? '',
      tradeLicense: normalized.tradeLicense ?? '',
      tradeLicenseValidTo: toDatePickerValue(normalized.tradeLicenseValidTo),
      mobile: normalized.mobile ?? '',
      email: normalized.email ?? '',
      address: normalized.address ?? '',
      contactPersonName: normalized.contactPersonName ?? '',
      contactPersonMobile: normalized.contactPersonMobile ?? '',
      supplierTypeEnumKey: normalized.supplierTypeEnumKey ?? null,
      country: normalized.country ?? '',
      enabled: normalized.enabled ?? true,
    });
  }

  private getSupplierRows(params: IGetRowsParams<SupplierResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new SupplierSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      supplierName: formValue.supplierName?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      supplierTypeEnumKey: formValue.supplierTypeEnumKey || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.supplierApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<SupplierResponse>(result);
          const rows = [...(page.content ?? [])];
          this.suppliers = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.suppliers = [];
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
    this.suppliers = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private refreshActionCells(supplierId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: supplierId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === supplierId)
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

  private renderActionsCell(supplier: SupplierResponse | undefined): string {
    if (!supplier) {
      return '';
    }

    return renderCrudActionButtons({
      canUpdate: this.canUpdate,
      canDelete: this.canDelete,
      deleting: this.deletingId === supplier.id,
      entityLabel: 'supplier',
    });
  }

}
