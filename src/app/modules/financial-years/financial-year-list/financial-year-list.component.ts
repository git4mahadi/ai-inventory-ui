import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { toDisplayDate } from '../../../core/utils/date.util';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { FinancialYearSearchDto } from '../../../models/search/FinancialYearSearchDto';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';

@Component({
  selector: 'app-financial-year-list',
  standalone: false,
  templateUrl: './financial-year-list.component.html',
  styleUrl: './financial-year-list.component.scss',
})
export class FinancialYearListComponent implements OnInit {
  readonly searchForm: FormGroup;
  financialYears: FinancialYearResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: FinancialYearResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      fyCode: [''],
      isCurrent: [null as boolean | null],
    });
  }

  ngOnInit(): void {
    this.loadFinancialYears();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.financialYears.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the financial year and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.fyCode || this.pendingDelete?.id || '';
  }

  formatDate(value?: string): string {
    return toDisplayDate(value) || '—';
  }

  loadFinancialYears(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new FinancialYearSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      fyCode: formValue.fyCode?.trim() || undefined,
      isCurrent:
        formValue.isCurrent === null || formValue.isCurrent === undefined
          ? undefined
          : !!formValue.isCurrent,
      page: this.page,
      size: this.size,
    });

    this.financialYearApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<FinancialYearResponse>(result);
          this.financialYears = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.financialYears.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.financialYears = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadFinancialYears();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      fyCode: '',
      isCurrent: null,
    });
    this.page = 0;
    this.loadFinancialYears();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadFinancialYears();
  }

  requestDelete(financialYear: FinancialYearResponse): void {
    if (!financialYear.id || this.deletingId) {
      return;
    }
    this.pendingDelete = financialYear;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const financialYear = this.pendingDelete;
    if (!financialYear?.id) {
      return;
    }

    this.deletingId = financialYear.id;
    this.financialYearApi
      .deleteFinancialYear(financialYear.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Financial year deleted successfully');
          if (this.financialYears.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadFinancialYears();
        },
      });
  }
}
