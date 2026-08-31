import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
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
import { normalizePage } from '../../../core/utils/api-response.util';
import { toApiDate } from '../../../core/utils/date.util';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { OpeningStockResponse } from '../../../models/response/OpeningStockResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { FinancialYearSearchDto } from '../../../models/search/FinancialYearSearchDto';
import { OpeningStockSearchDto } from '../../../models/search/OpeningStockSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';
import { OpeningStockApiService } from '../../../services/OpeningStockApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';

@Component({
  selector: 'app-opening-stock-list',
  standalone: false,
  templateUrl: './opening-stock-list.component.html',
  styleUrl: './opening-stock-list.component.scss',
})
export class OpeningStockListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly columnDefs: ColDef<OpeningStockResponse>[] = [
    {
      field: 'openingStockNcId',
      headerName: 'NC ID',
      flex: 1,
      minWidth: 145,
      cellClass: 'item-name cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'challanNo',
      headerName: 'Challan no',
      flex: 0.9,
      minWidth: 125,
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'challanDateFormatted',
      headerName: 'Date',
      flex: 0.85,
      minWidth: 115,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      colId: 'financialYear',
      headerName: 'FY',
      flex: 0.8,
      minWidth: 105,
      valueGetter: (params) => (params.data ? this.fyName(params.data) : '—'),
    },
    {
      colId: 'store',
      headerName: 'Store',
      flex: 1.4,
      minWidth: 180,
      cellClass: 'cell-muted',
      valueGetter: (params) => (params.data ? this.storeName(params.data.storeId) : '—'),
      tooltipValueGetter: (params) =>
        params.data ? this.storeName(params.data.storeId) : '—',
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
      cellRenderer: (params: ICellRendererParams<OpeningStockResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getOpeningStockRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<OpeningStockResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  openingStocks: OpeningStockResponse[] = [];
  storeOptions: StoreResponse[] = [];
  financialYearOptions: FinancialYearResponse[] = [];

  loading = false;
  hasLoaded = false;
  deletingId: string | null = null;
  pendingDelete: OpeningStockResponse | null = null;
  private gridApi?: GridApi<OpeningStockResponse>;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly openingStockApi: OpeningStockApiService,
    private readonly storeApi: StoreApiService,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      challanNo: [''],
      storeId: [null as string | null],
      financialYearId: [null as string | null],
      challanDate: [null as Date | null],
    });
  }

  ngOnInit(): void {
    this.loadLookups();
  }

  onGridReady(event: GridReadyEvent<OpeningStockResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<OpeningStockResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && event.data.id) {
      void this.router.navigate(['/opening-stocks/edit', event.data.id]);
    } else if (action === 'delete') {
      this.requestDelete(event.data);
    }
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the opening stock and all line items.';
  }

  get deleteDialogDetail(): string {
    return (
      this.pendingDelete?.openingStockNcId ||
      this.pendingDelete?.challanNo ||
      this.pendingDelete?.id ||
      ''
    );
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  fyLabel(financialYear: FinancialYearResponse): string {
    return financialYear.fyCode || financialYear.id || '';
  }

  storeName(storeId?: string): string {
    if (!storeId) {
      return '—';
    }
    const store = this.storeOptions.find((option) => option.id === storeId);
    return store ? this.storeLabel(store) : '—';
  }

  fyName(row: OpeningStockResponse): string {
    if (row.fyCode) {
      return row.fyCode;
    }
    const fy = this.financialYearOptions.find(
      (option) => option.id === row.financialYearId,
    );
    return fy?.fyCode || '—';
  }

  private getOpeningStockRows(params: IGetRowsParams<OpeningStockResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new OpeningStockSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      challanNo: formValue.challanNo?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      financialYearId: formValue.financialYearId || undefined,
      challanDate: toApiDate(formValue.challanDate),
      page: pageNumber,
      size: pageSize,
    });

    this.openingStockApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<OpeningStockResponse>(result);
          const rows = [...(page.content ?? [])];
          this.openingStocks = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.openingStocks = [];
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
      challanNo: '',
      storeId: null,
      financialYearId: null,
      challanDate: null,
    });
    this.reloadGrid();
  }

  requestDelete(row: OpeningStockResponse): void {
    if (!row.id || this.deletingId) {
      return;
    }
    this.pendingDelete = row;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const row = this.pendingDelete;
    if (!row?.id) {
      return;
    }

    this.deletingId = row.id;
    this.gridApi?.refreshCells({
      rowNodes: this.gridApi
        .getRenderedNodes()
        .filter((rowNode) => rowNode.data?.id === row.id),
      columns: ['actions'],
      force: true,
    });
    this.openingStockApi
      .deleteOpeningStock(row.id)
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
          this.toastr.success('Opening stock deleted successfully');
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.openingStocks = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private renderActionsCell(row: OpeningStockResponse | undefined): string {
    if (!row) {
      return '';
    }

    const deleteContent =
      this.deletingId === row.id
        ? '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        : '<img src="/assets/svg/icon-delete.svg" alt="" width="14" height="14" aria-hidden="true" />';

    return `
      <div class="row-actions">
        <button type="button" class="icon-action icon-edit" data-action="edit" title="Edit" aria-label="Edit opening stock">
          <img src="/assets/svg/icon-edit.svg" alt="" width="14" height="14" aria-hidden="true" />
        </button>
        <button type="button" class="icon-action icon-delete" data-action="delete" title="Delete" aria-label="Delete opening stock"${this.deletingId === row.id ? ' disabled' : ''}>
          ${deleteContent}
        </button>
      </div>
    `;
  }

  private loadLookups(): void {
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .subscribe((stores) => {
        this.storeOptions = stores ?? [];
        this.gridApi?.refreshCells({
          columns: ['store'],
          force: true,
        });
      });

    this.financialYearApi
      .searchList(new FinancialYearSearchDto({ enabled: true }))
      .subscribe((years) => {
        this.financialYearOptions = years ?? [];
        this.gridApi?.refreshCells({
          columns: ['financialYear'],
          force: true,
        });
      });
  }
}
