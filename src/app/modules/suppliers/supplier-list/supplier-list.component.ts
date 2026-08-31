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
import { SupplierTypeEnum } from '../../../models/enums/SupplierTypeEnum';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { SupplierApiService } from '../../../services/SupplierApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-supplier-list',
  standalone: false,
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
})
export class SupplierListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly supplierTypes = SupplierTypeEnum.enums;
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
      field: 'supplierTypeEnumValue',
      headerName: 'Type',
      flex: 1,
      minWidth: 125,
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
  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: SupplierResponse | null = null;
  private gridApi?: GridApi<SupplierResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierApi: SupplierApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      supplierName: [''],
      mobile: [''],
      supplierTypeEnumKey: [null as string | null],
    });
  }

  ngOnInit(): void {
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
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/suppliers/edit', event.data.id], {
        state: { supplier: event.data },
      });
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the supplier and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.supplierName || this.pendingDelete?.id || '';
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

  requestDelete(supplier: SupplierResponse): void {
    if (!supplier.id || this.deletingId) {
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
    this.gridApi?.refreshCells({
      rowNodes: this.gridApi
        .getRenderedNodes()
        .filter((rowNode) => rowNode.data?.id === supplier.id),
      columns: ['actions'],
      force: true,
    });
    this.supplierApi
      .deleteSupplier(supplier.id)
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
          this.toastr.success('Supplier deleted successfully');
          this.gridApi?.refreshInfiniteCache();
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

    const deleteContent =
      this.deletingId === supplier.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit supplier">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete supplier"${this.deletingId === supplier.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }
}
