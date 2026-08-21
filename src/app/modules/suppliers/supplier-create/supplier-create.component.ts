import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { toApiDate } from '../../../core/utils/date.util';
import { SupplierDto } from '../../../models/dto/SupplierDto';
import { SupplierTypeEnum } from '../../../models/enums/SupplierTypeEnum';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-supplier-create',
  standalone: false,
  templateUrl: './supplier-create.component.html',
  styleUrl: './supplier-create.component.scss',
})
export class SupplierCreateComponent {
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

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierApi: SupplierApiService,
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

  onSubmit(): void {
    this.submitted = true;
    if (this.supplierForm.invalid || this.loading) {
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
      .createSupplier(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Supplier created successfully');
          void this.router.navigate(['/suppliers/list']);
        },
      });
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
    this.submitted = false;
  }
}
