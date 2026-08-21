import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizeSupplier } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { SupplierDto } from '../../../models/dto/SupplierDto';
import { SupplierTypeEnum } from '../../../models/enums/SupplierTypeEnum';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-supplier-edit',
  standalone: false,
  templateUrl: './supplier-edit.component.html',
  styleUrl: './supplier-edit.component.scss',
})
export class SupplierEditComponent implements OnInit {
  readonly supplierForm: FormGroup;
  readonly supplierTypes = SupplierTypeEnum.enums;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'YYYY-MM-DD',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  submitted = false;
  loading = false;
  loadingSupplier = true;
  supplierId = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierApi: SupplierApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.supplierForm = this.formBuilder.group({
      supplierName: ['', [Validators.required, Validators.maxLength(120)]],
      tin: ['', [Validators.maxLength(20)]],
      bin: ['', [Validators.maxLength(20)]],
      tradeLicense: ['', [Validators.maxLength(20)]],
      tradeLicenseValidTo: [null as Date | null],
      mobile: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(120)]],
      address: ['', [Validators.maxLength(255)]],
      contactPersonName: ['', [Validators.maxLength(120)]],
      contactPersonMobile: ['', [Validators.maxLength(20)]],
      supplierTypeEnumKey: [null as string | null],
      country: ['', [Validators.maxLength(120)]],
      enabled: [true],
    });
  }

  get f() {
    return this.supplierForm.controls;
  }

  ngOnInit(): void {
    this.supplierId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.supplierId) {
      this.toastr.error('Supplier id is missing');
      void this.router.navigate(['/suppliers/list']);
      return;
    }

    const stateSupplier = normalizeSupplier(
      (history.state?.['supplier'] as SupplierResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.['supplier'],
    );
    if (stateSupplier) {
      this.patchForm(stateSupplier);
      this.loadingSupplier = false;
    }

    this.loadSupplier();
  }

  onClear(): void {
    this.supplierForm.reset({
      supplierName: '',
      tin: '',
      bin: '',
      tradeLicense: '',
      tradeLicenseValidTo: null,
      mobile: '',
      email: '',
      address: '',
      contactPersonName: '',
      contactPersonMobile: '',
      supplierTypeEnumKey: null,
      country: '',
      enabled: true,
    });
  }

  loadSupplier(): void {
    if (!this.supplierForm.get('supplierName')?.value) {
      this.loadingSupplier = true;
    }

    this.supplierApi
      .getSupplierById(this.supplierId)
      .pipe(finalize(() => (this.loadingSupplier = false)))
      .subscribe({
        next: (supplier) => {
          this.patchForm(supplier);
        },
        error: () => {
          if (!this.supplierForm.get('supplierName')?.value) {
            void this.router.navigate(['/suppliers/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.supplierForm.invalid || this.loading || !this.supplierId) {
      return;
    }

    const value = this.supplierForm.value;
    const dto = new SupplierDto({
      supplierName: value.supplierName?.trim(),
      tin: value.tin?.trim() || undefined,
      bin: value.bin?.trim() || undefined,
      tradeLicense: value.tradeLicense?.trim() || undefined,
      tradeLicenseValidTo: toApiDate(value.tradeLicenseValidTo),
      mobile: value.mobile?.trim() || undefined,
      email: value.email?.trim() || undefined,
      address: value.address?.trim() || undefined,
      contactPersonName: value.contactPersonName?.trim() || undefined,
      contactPersonMobile: value.contactPersonMobile?.trim() || undefined,
      supplierTypeEnumKey: value.supplierTypeEnumKey || undefined,
      country: value.country?.trim() || undefined,
      enabled: !!value.enabled,
    });

    this.loading = true;
    this.supplierApi
      .updateSupplier(this.supplierId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Supplier updated successfully');
          void this.router.navigate(['/suppliers/list']);
        },
      });
  }

  private patchForm(supplier: SupplierResponse): void {
    const normalized = normalizeSupplier(supplier);
    if (!normalized) {
      return;
    }

    this.supplierForm.patchValue({
      supplierName: normalized.supplierName ?? '',
      tin: normalized.tin ?? '',
      bin: normalized.bin ?? '',
      tradeLicense: normalized.tradeLicense ?? '',
      tradeLicenseValidTo: toDatePickerValue(normalized.tradeLicenseValidTo),
      mobile: normalized.mobile ?? '',
      email: normalized.email ?? '',
      address: normalized.address ?? '',
      contactPersonName: normalized.contactPersonName ?? '',
      contactPersonMobile: normalized.contactPersonMobile ?? '',
      supplierTypeEnumKey: normalized.supplierTypeEnumKey ?? null,
      country: normalized.country ?? '',
      enabled: normalized.enabled ?? true,
    });
  }
}
