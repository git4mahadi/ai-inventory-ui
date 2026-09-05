import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { NgSelectComponent } from '@ng-select/ng-select';
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
import { normalizeExpense, normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue, toDisplayDate } from '../../../core/utils/date.util';
import { ExpenseDto } from '../../../models/dto/ExpenseDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ExpenseResponse } from '../../../models/response/ExpenseResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { ExpenseSearchDto } from '../../../models/search/ExpenseSearchDto';
import { ExpenseApiService } from '../../../services/ExpenseApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import {
  appGridDefaultColDef,
  appGridModules,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';
import { AuthService } from '../../../core/services/auth.service';
import {
  crudAccess,
  hideActionsColumnIfNeeded,
  renderCrudActionButtons,
} from '../../../shared/utils/crud-access.util';

interface ExpenseCartItem {
  key: string;
  expenseDate: string;
  expenseHeadId: string;
  expenseHeadName: string;
  amount: number;
  remarks?: string;
  enabled: boolean;
}

@Component({
  selector: 'app-expense-list',
  standalone: false,
  templateUrl: './expense-list.component.html',
  styleUrl: './expense-list.component.scss',
})
export class ExpenseListComponent implements OnInit {
  @ViewChild('expenseHeadSelect') expenseHeadSelect?: NgSelectComponent;
  readonly expenseForm: FormGroup;
  readonly editForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<ExpenseResponse>[] = [
    {
      field: 'expenseDate',
      headerName: 'Date',
      flex: 0.9,
      minWidth: 120,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatDate(params.value),
    },
    {
      field: 'expenseHeadName',
      headerName: 'Head',
      flex: 1.2,
      minWidth: 150,
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'amount',
      headerName: 'Amount',
      flex: 0.9,
      minWidth: 120,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'remarks',
      headerName: 'Remarks',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      tooltipField: 'remarks',
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
      cellRenderer: (params: ICellRendererParams<ExpenseResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<ExpenseResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getExpenseRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<ExpenseResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  expenses: ExpenseResponse[] = [];
  cartItems: ExpenseCartItem[] = [];
  expenseHeadOptions: LookupResponse[] = [];
  submitted = false;
  editSubmitted = false;
  saving = false;
  updating = false;
  loading = false;
  loadingHeads = false;
  hasLoaded = false;
  editingExpense: ExpenseResponse | null = null;
  deletingId: string | null = null;
  pendingDelete: ExpenseResponse | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;
  private gridApi?: GridApi<ExpenseResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly expenseApi: ExpenseApiService,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
  ) {
    const access = crudAccess(this.authService, 'ROLE_EXPENSE');
    this.canCreate = access.canCreate;
    this.canUpdate = access.canUpdate;
    this.canDelete = access.canDelete;
    hideActionsColumnIfNeeded(this.columnDefs, access);
    this.expenseForm = this.createExpenseForm();
    this.editForm = this.createExpenseForm();
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      expenseDateFrom: [null as Date | null],
      expenseDateTo: [null as Date | null],
      expenseHeadId: [null as string | null],
    });
  }

  get f() {
    return this.expenseForm.controls;
  }

  get ef() {
    return this.editForm.controls;
  }

  get isEditing(): boolean {
    return !!this.editingExpense?.id;
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the expense and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    if (!this.pendingDelete) {
      return '';
    }
    const date = this.formatDate(this.pendingDelete.expenseDate);
    const head = this.pendingDelete.expenseHeadName || 'Expense';
    return `${date} · ${head}`;
  }

  ngOnInit(): void {
    this.loadExpenseHeads();
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadExpenseForEdit(routeId);
    }
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.lookupName || '';
  }

  formatDate(value?: string): string {
    return toDisplayDate(value) || '—';
  }

  onGridReady(event: GridReadyEvent<ExpenseResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<ExpenseResponse>): void {
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
      expenseDateFrom: null,
      expenseDateTo: null,
      expenseHeadId: null,
    });
    this.reloadGrid();
  }

  onAddToCart(focusHead = true): boolean {
    this.submitted = true;
    if (this.expenseForm.invalid || this.saving || !this.canCreate) {
      return false;
    }

    const item = this.buildCartItem(this.expenseForm.getRawValue());
    if (!item) {
      return false;
    }

    this.cartItems = [...this.cartItems, item];
    this.resetLineFields();
    if (focusHead) {
      this.focusExpenseHeadSelect();
    }
    return true;
  }

  onAddLineEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onAddToCart();
  }

  removeCartItem(key: string): void {
    if (this.saving) {
      return;
    }
    this.cartItems = this.cartItems.filter((item) => item.key !== key);
  }

  onSaveCart(): void {
    if (this.saving || !this.canCreate) {
      return;
    }

    if (this.hasDraftLine() && !this.onAddToCart(false)) {
      return;
    }

    if (!this.cartItems.length) {
      this.toastr.error('Add at least one expense to the cart');
      this.submitted = true;
      return;
    }

    const payload = this.cartItems.map(
      (item) =>
        new ExpenseDto({
          expenseDate: item.expenseDate,
          expenseHeadId: item.expenseHeadId,
          amount: item.amount,
          remarks: item.remarks,
          enabled: item.enabled,
        }),
    );

    this.saving = true;
    this.expenseApi
      .createExpenses(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => {
          const count = payload.length;
          this.toastr.success(
            count === 1 ? 'Expense created successfully' : `${count} expenses created successfully`,
          );
          this.resetForm();
          this.reloadGrid();
        },
      });
  }

  resetForm(): void {
    this.submitted = false;
    this.cartItems = [];
    this.expenseForm.reset({
      expenseDate: new Date(),
      expenseHeadId: null,
      amount: null,
      remarks: '',
      enabled: true,
    });
  }

  closeEditDialog(): void {
    if (this.updating) {
      return;
    }
    this.resetEditState();
  }

  private resetEditState(): void {
    this.editingExpense = null;
    this.editSubmitted = false;
    this.editForm.reset({
      expenseDate: new Date(),
      expenseHeadId: null,
      amount: null,
      remarks: '',
      enabled: true,
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/expenses']);
    }
  }

  onUpdate(): void {
    this.editSubmitted = true;
    const editingId = this.editingExpense?.id;
    if (this.editForm.invalid || this.updating || !editingId || !this.canUpdate) {
      return;
    }

    const dto = this.toDto(this.editForm.getRawValue());
    this.updating = true;
    this.expenseApi
      .updateExpense(editingId, dto)
      .pipe(finalize(() => (this.updating = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Expense updated successfully');
          this.resetEditState();
          this.reloadGrid();
        },
      });
  }

  requestDelete(expense: ExpenseResponse): void {
    if (!expense.id || this.deletingId || !this.canDelete) {
      return;
    }
    this.pendingDelete = expense;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const expense = this.pendingDelete;
    if (!expense?.id) {
      return;
    }

    this.deletingId = expense.id;
    this.refreshActionCells(expense.id);
    this.expenseApi
      .deleteExpense(expense.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Expense deleted successfully');
          if (this.editingExpense?.id === expense.id) {
            this.resetEditState();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(expense: ExpenseResponse): void {
    if (!this.canUpdate) {
      return;
    }
    const normalized = normalizeExpense(expense);
    if (!normalized?.id) {
      return;
    }

    this.patchEditForm(normalized);
    this.expenseApi.getExpenseById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingExpense?.id === normalized.id) {
          this.patchEditForm(full);
        }
      },
    });
  }

  private loadExpenseForEdit(id: string): void {
    if (!this.canUpdate) {
      this.closeEditDialog();
      return;
    }
    this.expenseApi.getExpenseById(id).subscribe({
      next: (expense) => this.patchEditForm(expense),
      error: () => this.closeEditDialog(),
    });
  }

  private patchEditForm(expense: ExpenseResponse): void {
    const normalized = normalizeExpense(expense);
    if (!normalized?.id) {
      return;
    }

    this.editingExpense = normalized;
    this.editSubmitted = false;
    this.editForm.patchValue({
      expenseDate: toDatePickerValue(normalized.expenseDate),
      expenseHeadId: normalized.expenseHeadId ?? null,
      amount: normalized.amount ?? null,
      remarks: normalized.remarks ?? '',
      enabled: normalized.enabled ?? true,
    });

    if (
      normalized.expenseHeadId &&
      !this.expenseHeadOptions.some((lookup) => lookup.id === normalized.expenseHeadId)
    ) {
      this.expenseHeadOptions = [
        {
          id: normalized.expenseHeadId,
          lookupName: normalized.expenseHeadName,
        },
        ...this.expenseHeadOptions,
      ];
    }
  }

  private getExpenseRows(params: IGetRowsParams<ExpenseResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const dateFrom = toApiDate(formValue.expenseDateFrom);
    const dateTo = toApiDate(formValue.expenseDateTo);
    const request = new ExpenseSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      expenseDateFrom: dateFrom || dateTo,
      expenseDateTo: dateTo || dateFrom,
      expenseHeadId: formValue.expenseHeadId || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.expenseApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ExpenseResponse>(result);
          const rows = [...(page.content ?? [])];
          this.expenses = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.expenses = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.hasLoaded = true;
          params.failCallback();
        },
      });
  }

  private loadExpenseHeads(): void {
    this.loadingHeads = true;
    this.lookupApi
      .getLookupListByEnumKey(LookupEnum.EXPENSE_HEAD.key)
      .pipe(finalize(() => (this.loadingHeads = false)))
      .subscribe({
        next: (lookups) => {
          this.expenseHeadOptions = lookups ?? [];
        },
      });
  }

  private createExpenseForm(): FormGroup {
    return this.formBuilder.group({
      expenseDate: [new Date() as Date | null, Validators.required],
      expenseHeadId: [null as string | null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['', [Validators.maxLength(255)]],
      enabled: [true],
    });
  }

  private toDto(value: {
    expenseDate?: Date | string | null;
    expenseHeadId?: string | null;
    amount?: number | null;
    remarks?: string | null;
    enabled?: boolean;
  }): ExpenseDto {
    return new ExpenseDto({
      expenseDate: toApiDate(value.expenseDate),
      expenseHeadId: value.expenseHeadId || undefined,
      amount: Number(value.amount),
      remarks: value.remarks?.trim() || undefined,
      enabled: !!value.enabled,
    });
  }

  private buildCartItem(value: {
    expenseDate?: Date | string | null;
    expenseHeadId?: string | null;
    amount?: number | null;
    remarks?: string | null;
    enabled?: boolean;
  }): ExpenseCartItem | null {
    const dto = this.toDto(value);
    if (!dto.expenseDate || !dto.expenseHeadId || dto.amount == null) {
      return null;
    }

    const head = this.expenseHeadOptions.find((lookup) => lookup.id === dto.expenseHeadId);
    return {
      key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      expenseDate: dto.expenseDate,
      expenseHeadId: dto.expenseHeadId,
      expenseHeadName: head?.parentFullName || head?.lookupName || 'Expense head',
      amount: dto.amount,
      remarks: dto.remarks,
      enabled: dto.enabled ?? true,
    };
  }

  private hasDraftLine(): boolean {
    const value = this.expenseForm.getRawValue();
    return !!(value.expenseHeadId || value.amount || value.remarks?.trim());
  }

  private resetLineFields(): void {
    this.submitted = false;
    this.expenseForm.patchValue({
      expenseHeadId: null,
      amount: null,
      remarks: '',
    });
  }

  private focusExpenseHeadSelect(): void {
    setTimeout(() => {
      this.expenseHeadSelect?.focus();
      this.expenseHeadSelect?.open();
    });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.expenses = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private refreshActionCells(expenseId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: expenseId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === expenseId)
        : undefined,
      columns: ['actions'],
      force: true,
    });
  }

  private formatNumber(value: number | undefined): string {
    return value == null ? '—' : formatToBdNumberingSystem(value);
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

  private renderActionsCell(expense: ExpenseResponse | undefined): string {
    if (!expense) {
      return '';
    }

    return renderCrudActionButtons({
      canUpdate: this.canUpdate,
      canDelete: this.canDelete,
      deleting: this.deletingId === expense.id,
      entityLabel: 'expense',
    });
  }
}
