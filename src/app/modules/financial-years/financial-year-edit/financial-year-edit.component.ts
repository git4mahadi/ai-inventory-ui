import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizeFinancialYear } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { FinancialYearDto } from '../../../models/dto/FinancialYearDto';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';

@Component({
  selector: 'app-financial-year-edit',
  standalone: false,
  templateUrl: './financial-year-edit.component.html',
  styleUrl: './financial-year-edit.component.scss',
})
export class FinancialYearEditComponent implements OnInit {
  readonly financialYearForm: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  submitted = false;
  loading = false;
  loadingFinancialYear = true;
  financialYearId = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.financialYearForm = this.formBuilder.group({
      fyCode: ['', [Validators.required, Validators.maxLength(20)]],
      startDate: [null as Date | null, [Validators.required]],
      endDate: [null as Date | null, [Validators.required]],
      isCurrent: [false],
      enabled: [true],
      description: ['', [Validators.maxLength(250)]],
    });
  }

  get f() {
    return this.financialYearForm.controls;
  }

  ngOnInit(): void {
    this.financialYearId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.financialYearId) {
      this.toastr.error('Financial year id is missing');
      void this.router.navigate(['/financial-years/list']);
      return;
    }

    const stateFinancialYear = normalizeFinancialYear(
      (history.state?.['financialYear'] as FinancialYearResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.[
          'financialYear'
        ],
    );
    if (stateFinancialYear) {
      this.patchForm(stateFinancialYear);
      this.loadingFinancialYear = false;
    }

    this.loadFinancialYear();
  }

  onClear(): void {
    this.financialYearForm.reset({
      fyCode: '',
      startDate: null,
      endDate: null,
      isCurrent: false,
      enabled: true,
      description: '',
    });
    this.submitted = false;
  }

  loadFinancialYear(): void {
    if (!this.financialYearForm.get('fyCode')?.value) {
      this.loadingFinancialYear = true;
    }

    this.financialYearApi
      .getFinancialYearById(this.financialYearId)
      .pipe(finalize(() => (this.loadingFinancialYear = false)))
      .subscribe({
        next: (financialYear) => {
          this.patchForm(financialYear);
        },
        error: () => {
          if (!this.financialYearForm.get('fyCode')?.value) {
            void this.router.navigate(['/financial-years/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (
      this.financialYearForm.invalid ||
      this.loading ||
      !this.financialYearId
    ) {
      return;
    }

    const value = this.financialYearForm.value;
    const dto = new FinancialYearDto({
      fyCode: value.fyCode?.trim(),
      startDate: toApiDate(value.startDate),
      endDate: toApiDate(value.endDate),
      isCurrent: !!value.isCurrent,
      enabled: !!value.enabled,
      description: value.description?.trim() || undefined,
    });

    this.loading = true;
    this.financialYearApi
      .updateFinancialYear(this.financialYearId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Financial year updated successfully');
          void this.router.navigate(['/financial-years/list']);
        },
      });
  }

  private patchForm(financialYear: FinancialYearResponse): void {
    const normalized = normalizeFinancialYear(financialYear);
    if (!normalized) {
      return;
    }

    this.financialYearForm.patchValue({
      fyCode: normalized.fyCode ?? '',
      startDate: toDatePickerValue(normalized.startDate),
      endDate: toDatePickerValue(normalized.endDate),
      isCurrent: !!normalized.isCurrent,
      enabled: normalized.enabled ?? true,
      description: normalized.description ?? '',
    });
  }
}
