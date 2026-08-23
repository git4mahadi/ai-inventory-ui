import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
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

  openingStocks: OpeningStockResponse[] = [];
  storeOptions: StoreResponse[] = [];
  financialYearOptions: FinancialYearResponse[] = [];

  loading = false;
  deletingId: string | null = null;
  pendingDelete: OpeningStockResponse | null = null;

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
    this.loadOpeningStocks();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.openingStocks.length);
    return Array.from({ length: missing }, (_, i) => i);
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

  loadOpeningStocks(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new OpeningStockSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      challanNo: formValue.challanNo?.trim() || undefined,
      storeId: formValue.storeId || undefined,
      financialYearId: formValue.financialYearId || undefined,
      challanDate: toApiDate(formValue.challanDate),
      page: this.page,
      size: this.size,
    });

    this.openingStockApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<OpeningStockResponse>(result);
          this.openingStocks = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.openingStocks.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.openingStocks = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadOpeningStocks();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      challanNo: '',
      storeId: null,
      financialYearId: null,
      challanDate: null,
    });
    this.page = 0;
    this.loadOpeningStocks();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadOpeningStocks();
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
    this.openingStockApi
      .deleteOpeningStock(row.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Opening stock deleted successfully');
          if (this.openingStocks.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadOpeningStocks();
        },
      });
  }

  private loadLookups(): void {
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .subscribe((stores) => {
        this.storeOptions = stores ?? [];
      });

    this.financialYearApi
      .searchList(new FinancialYearSearchDto({ enabled: true }))
      .subscribe((years) => {
        this.financialYearOptions = years ?? [];
      });
  }
}
