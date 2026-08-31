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
  themeQuartz,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizePage } from '../../../core/utils/api-response.util';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-item-list',
  standalone: false,
  templateUrl: './item-list.component.html',
  styleUrl: './item-list.component.scss',
})
export class ItemListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly columnDefs: ColDef<ItemResponse>[] = [
    {
      field: 'itemName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'item-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'itemCode',
      headerName: 'Code',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'itemBarcode',
      headerName: 'Barcode',
      flex: 1,
      minWidth: 135,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'supplierName',
      headerName: 'Supplier',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      tooltipField: 'supplierName',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'purchaseRate',
      headerName: 'Purchase',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'salesRate',
      headerName: 'Sales',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'isForeignItem',
      headerName: 'Foreign',
      flex: 0.8,
      minWidth: 100,
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
      cellRenderer: (params: ICellRendererParams<ItemResponse>) =>
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
      cellRenderer: (params: ICellRendererParams<ItemResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getItemRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<ItemResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);
  items: ItemResponse[] = [];
  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: ItemResponse | null = null;
  private gridApi?: GridApi<ItemResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      itemName: [''],
      itemCode: [''],
      itemBarcode: [''],
    });
  }

  ngOnInit(): void {
  }

  onGridReady(event: GridReadyEvent<ItemResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<ItemResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/items/edit', event.data.id], {
        state: { item: event.data },
      });
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the item and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.itemName || this.pendingDelete?.id || '';
  }

  private getItemRows(params: IGetRowsParams<ItemResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new ItemSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      itemName: formValue.itemName?.trim() || undefined,
      itemCode: formValue.itemCode?.trim() || undefined,
      itemBarcode: formValue.itemBarcode?.trim() || undefined,
      page: pageNumber,
      size: pageSize,
    });

    this.itemApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ItemResponse>(result);
          const rows = [...(page.content ?? [])];
          this.items = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.items = [];
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
      itemName: '',
      itemCode: '',
      itemBarcode: '',
    });
    this.reloadGrid();
  }

  requestDelete(item: ItemResponse): void {
    if (!item.id || this.deletingId) {
      return;
    }
    this.pendingDelete = item;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const item = this.pendingDelete;
    if (!item?.id) {
      return;
    }

    this.deletingId = item.id;
    this.itemApi
      .deleteItem(item.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Item deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.items = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
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

  private renderActionsCell(item: ItemResponse | undefined): string {
    if (!item) {
      return '';
    }

    const deleteContent =
      this.deletingId === item.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit item">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete item"${this.deletingId === item.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
