import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  finalize,
  of,
  switchMap,
  takeUntil,
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
import { normalizeLookup, normalizePage } from '../../../core/utils/api-response.util';
import { LookupDto } from '../../../models/dto/LookupDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { LookupApiService } from '../../../services/LookupApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';
import { AuthService } from '../../../core/services/auth.service';
import {
  crudAccess,
  hideActionsColumnIfNeeded,
  renderCrudActionButtons,
} from '../../../shared/utils/crud-access.util';

@Component({
  selector: 'app-lookup-list',
  standalone: false,
  templateUrl: './lookup-list.component.html',
  styleUrl: './lookup-list.component.scss',
})
export class LookupListComponent implements OnInit, OnDestroy {
  @ViewChild('lookupFormShell') lookupFormShell?: ElementRef<HTMLElement>;
  readonly lookupForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly lookupTypes = LookupEnum.enums;
  readonly parentTypeahead$ = new Subject<string>();
  readonly columnDefs: ColDef<LookupResponse>[] = [
    {
      field: 'lookupName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'lookup-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'lookupShortName',
      headerName: 'Short name',
      flex: 0.9,
      minWidth: 125,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'type',
      headerName: 'Type',
      flex: 1,
      minWidth: 125,
      valueGetter: (params) => this.typeLabel(params.data?.lookupEnumKey) || params.data?.lookupEnumValue || '—',
    },
    {
      colId: 'parent',
      headerName: 'Parent',
      flex: 1.3,
      minWidth: 180,
      cellClass: 'cell-muted',
      tooltipValueGetter: (params) => params.data?.parentFullName || params.data?.parentName || '—',
      valueGetter: (params) => params.data?.parentFullName || params.data?.parentName || '—',
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<LookupResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<LookupResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getLookupRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<LookupResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  parentOptions: LookupResponse[] = [];
  lookups: LookupResponse[] = [];
  loadingParents = false;
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: LookupResponse | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  private gridApi?: GridApi<LookupResponse>;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
  ) {
    const access = crudAccess(this.authService, 'ROLE_LOOKUP');
    this.canCreate = access.canCreate;
    this.canUpdate = access.canUpdate;
    this.canDelete = access.canDelete;
    hideActionsColumnIfNeeded(this.columnDefs, access);
    this.lookupForm = this.formBuilder.group({
      lookupEnumKey: [null as string | null, Validators.required],
      lookupName: ['', [Validators.required, Validators.maxLength(120)]],
      lookupShortName: ['', [Validators.maxLength(20)]],
      parentId: [{ value: null as string | null, disabled: true }],
      enabled: [true],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      lookupName: [''],
      lookupEnumKey: [null as string | null],
    });
  }

  get f() {
    return this.lookupForm.controls;
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
    return 'This will permanently remove the lookup and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.lookupName || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    this.setupParentTypeahead();
    this.lookupForm
      .get('lookupEnumKey')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        this.lookupForm.patchValue({ parentId: null }, { emitEvent: false });
        this.parentOptions = [];
        this.setParentEnabled(!!key);
      });

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadLookupForEdit(routeId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  typeLabel(key?: string | null): string {
    if (!key) {
      return '';
    }
    return this.lookupTypes.find((type) => type.key === key)?.value || '';
  }

  parentLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  onParentOpen(): void {
    if (!this.lookupForm.get('lookupEnumKey')?.value) {
      return;
    }
    this.parentTypeahead$.next('');
  }

  onGridReady(event: GridReadyEvent<LookupResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<LookupResponse>): void {
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
      lookupName: '',
      lookupEnumKey: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.lookupForm.invalid || this.saving || !this.canSave) {
      return;
    }

    const value = this.lookupForm.getRawValue();
    const dto = new LookupDto({
      lookupEnumKey: value.lookupEnumKey,
      lookupName: value.lookupName?.trim(),
      lookupShortName: value.lookupShortName?.trim() || undefined,
      parentId: value.parentId || undefined,
      enabled: !!value.enabled,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.lookupApi.updateLookup(this.editingId, dto)
      : this.lookupApi.createLookup(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(this.editingId ? 'Lookup updated successfully' : 'Lookup created successfully');
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.parentOptions = [];
    this.lookupForm.reset(
      {
        lookupEnumKey: null,
        lookupName: '',
        lookupShortName: '',
        parentId: null,
        enabled: true,
      },
      { emitEvent: false },
    );
    this.setParentEnabled(false);
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/lookups']);
    }
  }

  requestDelete(lookup: LookupResponse): void {
    if (!lookup.id || this.deletingId || !this.canDelete) {
      return;
    }
    this.pendingDelete = lookup;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const lookup = this.pendingDelete;
    if (!lookup?.id) {
      return;
    }

    this.deletingId = lookup.id;
    this.refreshActionCells(lookup.id);
    this.lookupApi
      .deleteLookup(lookup.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Lookup deleted successfully');
          if (this.editingId === lookup.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(lookup: LookupResponse): void {
    if (!this.canUpdate) {
      return;
    }
    const normalized = normalizeLookup(lookup);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.lookupFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.lookupApi.getLookupById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
    });
  }

  private loadLookupForEdit(id: string): void {
    if (!this.canUpdate) {
      this.resetForm();
      return;
    }
    this.lookupApi.getLookupById(id).subscribe({
      next: (lookup) => this.patchFormForEdit(lookup),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(lookup: LookupResponse): void {
    const normalized = normalizeLookup(lookup);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.lookupForm.patchValue(
      {
        lookupEnumKey: normalized.lookupEnumKey ?? null,
        lookupName: normalized.lookupName ?? '',
        lookupShortName: normalized.lookupShortName ?? '',
        parentId: normalized.parentId ?? null,
        enabled: normalized.enabled ?? true,
      },
      { emitEvent: false },
    );
    this.setParentEnabled(!!normalized.lookupEnumKey);
    this.parentOptions = normalized.parentId
      ? [
          {
            id: normalized.parentId,
            lookupName: normalized.parentName,
            parentFullName: normalized.parentFullName || normalized.parentName,
          },
        ]
      : [];
    this.ensureSelectedParentOption(normalized.parentId ?? null);
  }

  private setParentEnabled(enabled: boolean): void {
    const parentCtrl = this.lookupForm.get('parentId');
    if (enabled) {
      parentCtrl?.enable({ emitEvent: false });
    } else {
      parentCtrl?.disable({ emitEvent: false });
    }
  }

  private getLookupRows(params: IGetRowsParams<LookupResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new LookupSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      lookupName: formValue.lookupName?.trim() || undefined,
      lookupEnumKey: formValue.lookupEnumKey || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.lookupApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<LookupResponse>(result);
          const rows = [...(page.content ?? [])];
          this.lookups = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.lookups = [];
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
    this.lookups = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private setupParentTypeahead(): void {
    this.parentTypeahead$
      .pipe(
        debounceTime(300),
        switchMap((term) => this.searchParents(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((lookups) => {
        this.parentOptions = this.mergeSelectedParent(lookups);
      });
  }

  private searchParents(term: string) {
    const lookupEnumKey = this.lookupForm.get('lookupEnumKey')?.value;
    if (!lookupEnumKey) {
      return of(this.selectedParentOptions());
    }

    this.loadingParents = true;
    return this.lookupApi
      .searchTerm(
        new LookupSearchDto({
          searchTerm: term?.trim() || undefined,
          lookupEnumKey,
          enabled: true,
        }),
      )
      .pipe(
        map((lookups) =>
          (lookups ?? []).filter((lookup) => lookup.id && lookup.id !== this.editingId),
        ),
        catchError(() => of([])),
        finalize(() => (this.loadingParents = false)),
      );
  }

  private selectedParentOptions(): LookupResponse[] {
    const parentId = this.lookupForm.get('parentId')?.value as string | null;
    return this.parentOptions.filter((lookup) => lookup.id && lookup.id === parentId);
  }

  private mergeSelectedParent(incoming: LookupResponse[]): LookupResponse[] {
    const selected = this.selectedParentOptions();
    const map = new Map<string, LookupResponse>();
    for (const lookup of [...selected, ...incoming]) {
      if (lookup.id) {
        map.set(lookup.id, lookup);
      }
    }
    return [...map.values()];
  }

  private ensureSelectedParentOption(parentId: string | null): void {
    if (!parentId || this.parentOptions.some((lookup) => lookup.id === parentId)) {
      return;
    }

    this.lookupApi.getLookupById(parentId).subscribe({
      next: (parent) => {
        if (parent?.id && parent.id !== this.editingId) {
          this.parentOptions = [parent, ...this.parentOptions];
        }
      },
    });
  }

  private refreshActionCells(lookupId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: lookupId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === lookupId)
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

  private renderActionsCell(lookup: LookupResponse | undefined): string {
    if (!lookup) {
      return '';
    }

    return renderCrudActionButtons({
      canUpdate: this.canUpdate,
      canDelete: this.canDelete,
      deleting: this.deletingId === lookup.id,
      entityLabel: 'lookup',
    });
  }

}
