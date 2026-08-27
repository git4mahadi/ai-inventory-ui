import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  AllCommunityModule,
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IGetRowsParams,
  ModuleRegistry,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { StoreApiService } from '../../../services/StoreApiService';
import {
  appGridDefaultColDef,
  appGridTheme,
} from '../../../shared/utils/ag-grid.util';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-store-list',
  standalone: false,
  templateUrl: './store-list.component.html',
  styleUrl: './store-list.component.scss',
})
export class StoreListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly columnDefs: ColDef<StoreResponse>[] = [
    {
      field: 'storeName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'store-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'storeCode',
      headerName: 'Code',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
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
      field: 'address',
      headerName: 'Address',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      tooltipField: 'address',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'isMain',
      headerName: 'Main',
      width: 80,
      minWidth: 80,
      maxWidth: 80,
      valueFormatter: (params) => (params.value ? 'Yes' : 'No'),
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<StoreResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<StoreResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getStoreRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<StoreResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);
  stores: StoreResponse[] = [];
  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: StoreResponse | null = null;
  private gridApi?: GridApi<StoreResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeName: [''],
      storeCode: [''],
      mobile: [''],
    });
  }

  ngOnInit(): void {
  }

  onGridReady(event: GridReadyEvent<StoreResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<StoreResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/stores/edit', event.data.id], {
        state: { store: event.data },
      });
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the store and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.storeName || this.pendingDelete?.id || '';
  }

  private getStoreRows(params: IGetRowsParams<StoreResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new StoreSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeName: formValue.storeName?.trim() || undefined,
      storeCode: formValue.storeCode?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.storeApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<StoreResponse>(result);
          const rows = [...(page.content ?? [])];
          this.stores = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.stores = [];
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
      storeName: '',
      storeCode: '',
      mobile: '',
    });
    this.reloadGrid();
  }

  requestDelete(store: StoreResponse): void {
    if (!store.id || this.deletingId) {
      return;
    }
    this.pendingDelete = store;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const store = this.pendingDelete;
    if (!store?.id) {
      return;
    }

    this.deletingId = store.id;
    this.gridApi?.refreshCells({
      rowNodes: this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === store.id),
      columns: ['actions'],
      force: true,
    });
    this.storeApi
      .deleteStore(store.id)
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
          this.toastr.success('Store deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.stores = [];
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

  private renderActionsCell(store: StoreResponse | undefined): string {
    if (!store) {
      return '';
    }

    const deleteContent =
      this.deletingId === store.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit store">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete store"${this.deletingId === store.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
