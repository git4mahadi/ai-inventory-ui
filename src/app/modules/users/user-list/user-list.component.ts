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
import { normalizePage, normalizeUser, normalizeUserGroup } from '../../../core/utils/api-response.util';
import { UserDto } from '../../../models/dto/UserDto';
import { AuthorityEnum } from '../../../models/enums/AuthorityEnum';
import { UserGroupResponse } from '../../../models/response/UserGroupResponse';
import { UserResponse } from '../../../models/response/UserResponse';
import { UserGroupSearchDto } from '../../../models/search/UserGroupSearchDto';
import { UserSearchDto } from '../../../models/search/UserSearchDto';
import { UserApiService } from '../../../services/UserApiService';
import { UserGroupApiService } from '../../../services/UserGroupApiService';
import {
  appGridDefaultColDef,
  appGridModules,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-user-list',
  standalone: false,
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  @ViewChild('userFormShell') userFormShell?: ElementRef<HTMLElement>;

  readonly userForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly authorities = AuthorityEnum.enums2;
  readonly columnDefs: ColDef<UserResponse>[] = [
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      minWidth: 120,
      cellClass: 'user-username',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'fullName',
      headerName: 'Full name',
      flex: 1.2,
      minWidth: 150,
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'authority',
      headerName: 'Authority',
      flex: 0.9,
      minWidth: 120,
      valueFormatter: (params) => AuthorityEnum.getValueByKey(params.value) || '—',
    },
    {
      colId: 'groups',
      headerName: 'Groups',
      flex: 1.3,
      minWidth: 160,
      cellClass: 'cell-muted',
      valueGetter: (params) => this.groupSummary(params.data?.groups),
      tooltipValueGetter: (params) => this.groupSummary(params.data?.groups),
    },
    {
      field: 'isAccountEnabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<UserResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<UserResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getUserRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<UserResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  groupOptions: UserGroupResponse[] = [];
  loadingGroups = false;
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: UserResponse | null = null;
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  private gridApi?: GridApi<UserResponse>;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly userApi: UserApiService,
    private readonly userGroupApi: UserGroupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.userForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.maxLength(20)]],
      fullName: ['', [Validators.maxLength(120)]],
      password: ['', [Validators.required, Validators.maxLength(120)]],
      authority: [null as string | null, [Validators.required]],
      groupIds: [[] as string[]],
      isAccountEnabled: [true],
      isAccountExpired: [false],
      isAccountLocked: [false],
      isCredentialExpired: [false],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      username: [''],
      fullName: [''],
      authority: [null as string | null],
      enabled: [null as boolean | null],
    });
  }

  get f() {
    return this.userForm.controls;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the user and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.username || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    this.loadGroups();
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadUserForEdit(routeId);
    }
  }

  onGridReady(event: GridReadyEvent<UserResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<UserResponse>): void {
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
      username: '',
      fullName: '',
      authority: null,
      enabled: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.userForm.invalid || this.saving) {
      return;
    }

    const value = this.userForm.getRawValue();
    const password = value.password?.trim() || '';
    const dto = new UserDto({
      username: value.username?.trim(),
      fullName: value.fullName?.trim() || undefined,
      password,
      authority: value.authority,
      isAccountEnabled: !!value.isAccountEnabled,
      isAccountExpired: !!value.isAccountExpired,
      isAccountLocked: !!value.isAccountLocked,
      isCredentialExpired: !!value.isCredentialExpired,
      groupIds: Array.isArray(value.groupIds) ? value.groupIds : [],
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.userApi.updateUser(this.editingId, dto)
      : this.userApi.createUser(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'User updated successfully' : 'User created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.setPasswordRequired(true);
    this.userForm.reset({
      username: '',
      fullName: '',
      password: '',
      authority: null,
      groupIds: [],
      isAccountEnabled: true,
      isAccountExpired: false,
      isAccountLocked: false,
      isCredentialExpired: false,
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/users']);
    }
  }

  requestDelete(user: UserResponse): void {
    if (!user.id || this.deletingId) {
      return;
    }
    this.pendingDelete = user;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const user = this.pendingDelete;
    if (!user?.id) {
      return;
    }

    this.deletingId = user.id;
    this.refreshActionCells(user.id);
    this.userApi
      .deleteUser(user.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('User deleted successfully');
          if (this.editingId === user.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  groupLabel(group: UserGroupResponse): string {
    return group.groupName || group.id || '';
  }

  private startEdit(user: UserResponse): void {
    const normalized = normalizeUser(user);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.userFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.userApi.getUserById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
      error: () => undefined,
    });
  }

  private loadUserForEdit(id: string): void {
    this.userApi.getUserById(id).subscribe({
      next: (user) => this.patchFormForEdit(user),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(user: UserResponse): void {
    const normalized = normalizeUser(user);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.setPasswordRequired(false);
    this.ensureGroupOptions(normalized.groups ?? []);
    this.userForm.patchValue({
      username: normalized.username ?? '',
      fullName: normalized.fullName ?? '',
      password: '',
      authority: normalized.authority ?? null,
      groupIds: (normalized.groups ?? [])
        .map((group) => group.id)
        .filter((id): id is string => !!id),
      isAccountEnabled: normalized.isAccountEnabled ?? true,
      isAccountExpired: normalized.isAccountExpired ?? false,
      isAccountLocked: normalized.isAccountLocked ?? false,
      isCredentialExpired: normalized.isCredentialExpired ?? false,
    });
  }

  private setPasswordRequired(required: boolean): void {
    const control = this.userForm.get('password');
    control?.setValidators(
      required
        ? [Validators.required, Validators.maxLength(120)]
        : [Validators.maxLength(120)],
    );
    control?.updateValueAndValidity({ emitEvent: false });
  }

  private loadGroups(): void {
    this.loadingGroups = true;
    this.userGroupApi
      .searchList(new UserGroupSearchDto({ enabled: true }))
      .pipe(finalize(() => (this.loadingGroups = false)))
      .subscribe({
        next: (groups) => {
          this.groupOptions = (groups ?? [])
            .map((group) => normalizeUserGroup(group))
            .filter((group): group is UserGroupResponse => !!group);
        },
        error: () => {
          this.groupOptions = [];
        },
      });
  }

  private ensureGroupOptions(groups: UserGroupResponse[]): void {
    const missing = groups.filter(
      (group) => group.id && !this.groupOptions.some((option) => option.id === group.id),
    );
    if (missing.length) {
      this.groupOptions = [...this.groupOptions, ...missing];
    }
  }

  private getUserRows(params: IGetRowsParams<UserResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const enabled =
      formValue.enabled === null || formValue.enabled === undefined
        ? undefined
        : !!formValue.enabled;
    const request = new UserSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      username: formValue.username?.trim() || undefined,
      fullName: formValue.fullName?.trim() || undefined,
      authority: formValue.authority || undefined,
      enabled,
      page: pageNumber,
      size: pageSize,
    });

    this.userApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<UserResponse>(result);
          const rows = (page.content ?? []).map((row) => normalizeUser(row) ?? row);
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
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

  private refreshActionCells(userId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: userId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === userId)
        : undefined,
      columns: ['actions'],
      force: true,
    });
  }

  private groupSummary(groups?: UserGroupResponse[]): string {
    const names = (groups ?? [])
      .map((group) => group.groupName)
      .filter((name): name is string => !!name);
    return names.length ? names.join(', ') : '—';
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

  private renderActionsCell(user: UserResponse | undefined): string {
    if (!user) {
      return '';
    }

    const deleteContent =
      this.deletingId === user.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit user">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete user"${this.deletingId === user.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
