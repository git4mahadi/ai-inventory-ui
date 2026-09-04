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
import { normalizePage, normalizeUserGroup } from '../../../core/utils/api-response.util';
import { UserGroupDto } from '../../../models/dto/UserGroupDto';
import { UserGroupResponse } from '../../../models/response/UserGroupResponse';
import { UserGroupSearchDto } from '../../../models/search/UserGroupSearchDto';
import {
  ALL_PERMISSION_ROLES,
  PermissionNode,
  PERMISSION_TREE,
  collectNodeRoles,
} from '../../../models/security/permissions';
import { UserGroupApiService } from '../../../services/UserGroupApiService';
import {
  appGridDefaultColDef,
  appGridModules,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-user-group-list',
  standalone: false,
  templateUrl: './user-group-list.component.html',
  styleUrl: './user-group-list.component.scss',
})
export class UserGroupListComponent implements OnInit {
  @ViewChild('userGroupFormShell') userGroupFormShell?: ElementRef<HTMLElement>;

  readonly userGroupForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly permissionTree = PERMISSION_TREE;
  readonly permissionTreeLeft = PERMISSION_TREE.slice(
    0,
    Math.ceil(PERMISSION_TREE.length / 2),
  );
  readonly permissionTreeRight = PERMISSION_TREE.slice(
    Math.ceil(PERMISSION_TREE.length / 2),
  );
  readonly totalRoleCount = ALL_PERMISSION_ROLES.length;
  readonly columnDefs: ColDef<UserGroupResponse>[] = [
    {
      field: 'groupName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'user-group-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'permissions',
      headerName: 'Permissions',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      valueGetter: (params) => this.permissionSummary(params.data?.permissions),
      tooltipValueGetter: (params) => (params.data?.permissions ?? []).join(', '),
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<UserGroupResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<UserGroupResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getUserGroupRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<UserGroupResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: UserGroupResponse | null = null;
  selectedRoles = new Set<string>();
  expandedIds = new Set<string>();
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  private gridApi?: GridApi<UserGroupResponse>;
  private readonly rolesByNodeId = new Map<string, string[]>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly userGroupApi: UserGroupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.userGroupForm = this.formBuilder.group({
      groupName: ['', [Validators.required, Validators.maxLength(100)]],
      enabled: [true],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      groupName: [''],
      enabled: [null as boolean | null],
    });
  }

  get f() {
    return this.userGroupForm.controls;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get selectedCount(): number {
    return this.selectedRoles.size;
  }

  get allPermissionsSelected(): boolean {
    return this.totalRoleCount > 0 && this.selectedRoles.size === this.totalRoleCount;
  }

  get somePermissionsSelected(): boolean {
    return this.selectedRoles.size > 0 && !this.allPermissionsSelected;
  }

  get permissionsInvalid(): boolean {
    return this.submitted && this.selectedRoles.size === 0;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the user group and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.groupName || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadUserGroupForEdit(routeId);
    }
  }

  onGridReady(event: GridReadyEvent<UserGroupResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<UserGroupResponse>): void {
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
      groupName: '',
      enabled: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.userGroupForm.invalid || this.selectedRoles.size === 0 || this.saving) {
      return;
    }

    const value = this.userGroupForm.getRawValue();
    const dto = new UserGroupDto({
      groupName: value.groupName?.trim(),
      permissions: [...this.selectedRoles],
      enabled: !!value.enabled,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.userGroupApi.updateUserGroup(this.editingId, dto)
      : this.userGroupApi.createUserGroup(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'User group updated successfully' : 'User group created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.selectedRoles = new Set<string>();
    this.expandedIds = new Set<string>();
    this.userGroupForm.reset({
      groupName: '',
      enabled: true,
    });
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/user-groups']);
    }
  }

  requestDelete(group: UserGroupResponse): void {
    if (!group.id || this.deletingId) {
      return;
    }
    this.pendingDelete = group;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const group = this.pendingDelete;
    if (!group?.id) {
      return;
    }

    this.deletingId = group.id;
    this.refreshActionCells(group.id);
    this.userGroupApi
      .deleteUserGroup(group.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('User group deleted successfully');
          if (this.editingId === group.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  hasChildren(node: PermissionNode): boolean {
    return !!node.children?.length;
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  toggleExpand(id: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    const next = new Set(this.expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds = next;
  }

  expandAll(): void {
    const next = new Set<string>();
    const walk = (nodes: PermissionNode[]) => {
      for (const node of nodes) {
        if (node.children?.length) {
          next.add(node.id);
          walk(node.children);
        }
      }
    };
    walk(this.permissionTree);
    this.expandedIds = next;
  }

  collapseAll(): void {
    this.expandedIds = new Set<string>();
  }

  isNodeChecked(node: PermissionNode): boolean {
    const roles = this.nodeRoles(node);
    return roles.length > 0 && roles.every((role) => this.selectedRoles.has(role));
  }

  isNodeIndeterminate(node: PermissionNode): boolean {
    const roles = this.nodeRoles(node);
    const selected = roles.filter((role) => this.selectedRoles.has(role)).length;
    return selected > 0 && selected < roles.length;
  }

  nodeSelectedCount(node: PermissionNode): number {
    return this.nodeRoles(node).filter((role) => this.selectedRoles.has(role)).length;
  }

  nodeRoleCount(node: PermissionNode): number {
    return this.nodeRoles(node).length;
  }

  onNodeToggle(node: PermissionNode, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    const next = new Set(this.selectedRoles);
    for (const role of this.nodeRoles(node)) {
      if (checked) {
        next.add(role);
      } else {
        next.delete(role);
      }
    }
    this.selectedRoles = next;
  }

  onToggleAll(event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.selectedRoles = checked ? new Set(ALL_PERMISSION_ROLES) : new Set<string>();
    if (checked) {
      this.expandAll();
    }
  }

  private startEdit(group: UserGroupResponse): void {
    const normalized = normalizeUserGroup(group);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.userGroupFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.userGroupApi.getUserGroupById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
      error: () => undefined,
    });
  }

  private loadUserGroupForEdit(id: string): void {
    this.userGroupApi.getUserGroupById(id).subscribe({
      next: (group) => this.patchFormForEdit(group),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(group: UserGroupResponse): void {
    const normalized = normalizeUserGroup(group);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.selectedRoles = new Set(normalized.permissions ?? []);
    this.userGroupForm.patchValue({
      groupName: normalized.groupName ?? '',
      enabled: normalized.enabled ?? true,
    });
    this.expandNodesWithSelection();
  }

  private expandNodesWithSelection(): void {
    const next = new Set<string>();
    const walk = (nodes: PermissionNode[]) => {
      for (const node of nodes) {
        if (!node.children?.length) {
          continue;
        }
        if (this.nodeRoles(node).some((role) => this.selectedRoles.has(role))) {
          next.add(node.id);
        }
        walk(node.children);
      }
    };
    walk(this.permissionTree);
    this.expandedIds = next;
  }

  private nodeRoles(node: PermissionNode): string[] {
    let roles = this.rolesByNodeId.get(node.id);
    if (!roles) {
      roles = collectNodeRoles(node);
      this.rolesByNodeId.set(node.id, roles);
    }
    return roles;
  }

  private getUserGroupRows(params: IGetRowsParams<UserGroupResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const enabled =
      formValue.enabled === null || formValue.enabled === undefined
        ? undefined
        : !!formValue.enabled;
    const request = new UserGroupSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      groupName: formValue.groupName?.trim() || undefined,
      enabled,
      page: pageNumber,
      size: pageSize,
    });

    this.userGroupApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<UserGroupResponse>(result);
          const rows = (page.content ?? []).map(
            (row) => normalizeUserGroup(row) ?? row,
          );
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

  private refreshActionCells(groupId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: groupId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === groupId)
        : undefined,
      columns: ['actions'],
      force: true,
    });
  }

  private permissionSummary(permissions?: string[]): string {
    const count = permissions?.length ?? 0;
    if (!count) {
      return '—';
    }
    return `${formatToBdNumberingSystem(count, 0)} selected`;
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

  private renderActionsCell(group: UserGroupResponse | undefined): string {
    if (!group) {
      return '';
    }

    const deleteContent =
      this.deletingId === group.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit user group">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete user group"${this.deletingId === group.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
