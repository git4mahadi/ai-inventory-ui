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
import { normalizeFinancialYear, normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue, toDisplayDate } from '../../../core/utils/date.util';
import { FinancialYearDto } from '../../../models/dto/FinancialYearDto';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { FinancialYearSearchDto } from '../../../models/search/FinancialYearSearchDto';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-financial-year-list',
  standalone: false,
  templateUrl: './financial-year-list.component.html',
  styleUrl: './financial-year-list.component.scss',
})
export class FinancialYearListComponent implements OnInit {
  @ViewChild('fyFormShell') fyFormShell?: ElementRef<HTMLElement>;
  readonly financialYearForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<FinancialYearResponse>[] = [
    {
      field: 'fyCode',
      headerName: 'Code',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'fy-code',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'startDate',
      headerName: 'Start',
      flex: 0.9,
      minWidth: 120,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatDate(params.value),
    },
    {
      field: 'endDate',
      headerName: 'End',
      flex: 0.9,
      minWidth: 120,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatDate(params.value),
    },
    {
      field: 'isCurrent',
      headerName: 'Current',
      flex: 0.8,
      minWidth: 100,
      valueFormatter: (params) => (params.value ? 'Yes' : 'No'),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      tooltipField: 'description',
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
      cellRenderer: (params: ICellRendererParams<FinancialYearResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<FinancialYearResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getFinancialYearRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<FinancialYearResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  financialYears: FinancialYearResponse[] = [];
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: FinancialYearResponse | null = null;
  private gridApi?: GridApi<FinancialYearResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.financialYearForm = this.formBuilder.group({
      fyCode: ['', [Validators.required, Validators.maxLength(20)]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null, [Validators.required]],
      isCurrent: [false],
      enabled: [true],
      description: ['', [Validators.maxLength(250)]],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      fyCode: [''],
      isCurrent: [null as boolean | null],
    });
  }

  get f() {
    return this.financialYearForm.controls;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the financial year and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.fyCode || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadFinancialYearForEdit(routeId);
    }
  }

  formatDate(value?: string): string {
    return toDisplayDate(value) || '—';
  }

  onGridReady(event: GridReadyEvent<FinancialYearResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<FinancialYearResponse>): void {
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
      fyCode: '',
      isCurrent: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.financialYearForm.invalid || this.saving) {
      return;
    }

    const value = this.financialYearForm.getRawValue();
    const dto = new FinancialYearDto({
      fyCode: value.fyCode?.trim(),
      startDate: toApiDate(value.startDate),
      endDate: toApiDate(value.endDate),
      isCurrent: !!value.isCurrent,
      enabled: !!value.enabled,
      description: value.description?.trim() || undefined,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.financialYearApi.updateFinancialYear(this.editingId, dto)
      : this.financialYearApi.createFinancialYear(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'Financial year updated successfully' : 'Financial year created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.financialYearForm.reset({
      fyCode: '',
      startDate: null,
      endDate: null,
      isCurrent: false,
      enabled: true,
      description: '',
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/financial-years']);
    }
  }

  requestDelete(financialYear: FinancialYearResponse): void {
    if (!financialYear.id || this.deletingId) {
      return;
    }
    this.pendingDelete = financialYear;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const financialYear = this.pendingDelete;
    if (!financialYear?.id) {
      return;
    }

    this.deletingId = financialYear.id;
    this.refreshActionCells(financialYear.id);
    this.financialYearApi
      .deleteFinancialYear(financialYear.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Financial year deleted successfully');
          if (this.editingId === financialYear.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(financialYear: FinancialYearResponse): void {
    const normalized = normalizeFinancialYear(financialYear);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.fyFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.financialYearApi.getFinancialYearById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
    });
  }

  private loadFinancialYearForEdit(id: string): void {
    this.financialYearApi.getFinancialYearById(id).subscribe({
      next: (financialYear) => this.patchFormForEdit(financialYear),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(financialYear: FinancialYearResponse): void {
    const normalized = normalizeFinancialYear(financialYear);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.financialYearForm.patchValue({
      fyCode: normalized.fyCode ?? '',
      startDate: toDatePickerValue(normalized.startDate),
      endDate: toDatePickerValue(normalized.endDate),
      isCurrent: !!normalized.isCurrent,
      enabled: normalized.enabled ?? true,
      description: normalized.description ?? '',
    });
  }

  private getFinancialYearRows(params: IGetRowsParams<FinancialYearResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new FinancialYearSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      fyCode: formValue.fyCode?.trim() || undefined,
      isCurrent:
        formValue.isCurrent === null || formValue.isCurrent === undefined
          ? undefined
          : !!formValue.isCurrent,
      page: pageNumber,
      size: pageSize,
    });

    this.financialYearApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<FinancialYearResponse>(result);
          const rows = [...(page.content ?? [])];
          this.financialYears = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.financialYears = [];
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
    this.financialYears = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private refreshActionCells(financialYearId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: financialYearId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === financialYearId)
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

  private renderActionsCell(financialYear: FinancialYearResponse | undefined): string {
    if (!financialYear) {
      return '';
    }

    const deleteContent =
      this.deletingId === financialYear.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit financial year">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete financial year"${this.deletingId === financialYear.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
