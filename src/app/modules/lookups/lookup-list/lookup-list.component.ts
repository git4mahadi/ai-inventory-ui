import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
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
import { normalizePage } from '../../../core/utils/api-response.util';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { LookupApiService } from '../../../services/LookupApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-lookup-list',
  standalone: false,
  templateUrl: './lookup-list.component.html',
  styleUrl: './lookup-list.component.scss',
})
export class LookupListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly lookupTypes = LookupEnum.enums;
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
      field: 'lookupEnumValue',
      headerName: 'Type',
      flex: 1,
      minWidth: 125,
      valueFormatter: (params) => params.value || '—',
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
  lookups: LookupResponse[] = [];
  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: LookupResponse | null = null;
  private gridApi?: GridApi<LookupResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly lookupApi: LookupApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      lookupName: [''],
      lookupEnumKey: [null as string | null],
    });
  }

  ngOnInit(): void {
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
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/lookups/edit', event.data.id], {
        state: { lookup: event.data },
      });
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the lookup and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.lookupName || this.pendingDelete?.id || '';
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

  requestDelete(lookup: LookupResponse): void {
    if (!lookup.id || this.deletingId) {
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
    this.gridApi?.refreshCells({
      rowNodes: this.gridApi
        .getRenderedNodes()
        .filter((rowNode) => rowNode.data?.id === lookup.id),
      columns: ['actions'],
      force: true,
    });
    this.lookupApi
      .deleteLookup(lookup.id)
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
          this.toastr.success('Lookup deleted successfully');
          this.gridApi?.refreshInfiniteCache();
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

    const deleteContent =
      this.deletingId === lookup.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit lookup">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete lookup"${this.deletingId === lookup.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
