import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { toApiDate } from '../../../core/utils/date.util';
import { FinancialYearDto } from '../../../models/dto/FinancialYearDto';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';

@Component({
  selector: 'app-financial-year-create',
  standalone: false,
  templateUrl: './financial-year-create.component.html',
  styleUrl: './financial-year-create.component.scss',
})
export class FinancialYearCreateComponent {
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly financialYearApi: FinancialYearApiService,
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

  onSubmit(): void {
    this.submitted = true;
    if (this.financialYearForm.invalid || this.loading) {
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
      .createFinancialYear(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Financial year created successfully');
          void this.router.navigate(['/financial-years/list']);
        },
      });
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
}
