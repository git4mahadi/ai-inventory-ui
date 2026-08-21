import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizeCustomer } from '../../../core/utils/api-response.util';
import { CustomerDto } from '../../../models/dto/CustomerDto';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { CustomerApiService } from '../../../services/CustomerApiService';

@Component({
  selector: 'app-customer-edit',
  standalone: false,
  templateUrl: './customer-edit.component.html',
  styleUrl: './customer-edit.component.scss',
})
export class CustomerEditComponent implements OnInit {
  readonly customerForm: FormGroup;
  submitted = false;
  loading = false;
  loadingCustomer = true;
  customerId = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customerApi: CustomerApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.customerForm = this.formBuilder.group({
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      mobile: ['', [Validators.maxLength(20)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      address: ['', [Validators.maxLength(250)]],
      enabled: [true],
    });
  }

  get f() {
    return this.customerForm.controls;
  }

  ngOnInit(): void {
    this.customerId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.customerId) {
      this.toastr.error('Customer id is missing');
      void this.router.navigate(['/customers/list']);
      return;
    }

    const stateCustomer = normalizeCustomer(
      (history.state?.['customer'] as CustomerResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.['customer'],
    );
    if (stateCustomer) {
      this.patchForm(stateCustomer);
      this.loadingCustomer = false;
    }

    this.loadCustomer();
  }

  onClear(): void {
    this.customerForm.reset({
      customerName: '',
      mobile: '',
      email: '',
      address: '',
      enabled: true,
    });
    this.submitted = false;
  }

  loadCustomer(): void {
    if (!this.customerForm.get('customerName')?.value) {
      this.loadingCustomer = true;
    }

    this.customerApi
      .getCustomerById(this.customerId)
      .pipe(finalize(() => (this.loadingCustomer = false)))
      .subscribe({
        next: (customer) => {
          this.patchForm(customer);
        },
        error: () => {
          if (!this.customerForm.get('customerName')?.value) {
            void this.router.navigate(['/customers/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.customerForm.invalid || this.loading || !this.customerId) {
      return;
    }

    const dto = new CustomerDto({
      customerName: this.customerForm.value.customerName?.trim(),
      mobile: this.customerForm.value.mobile?.trim() || undefined,
      email: this.customerForm.value.email?.trim() || undefined,
      address: this.customerForm.value.address?.trim() || undefined,
      enabled: !!this.customerForm.value.enabled,
    });

    this.loading = true;
    this.customerApi
      .updateCustomer(this.customerId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Customer updated successfully');
          void this.router.navigate(['/customers/list']);
        },
      });
  }

  private patchForm(customer: CustomerResponse): void {
    const normalized = normalizeCustomer(customer);
    if (!normalized) {
      return;
    }

    this.customerForm.patchValue({
      customerName: normalized.customerName ?? '',
      mobile: normalized.mobile ?? '',
      email: normalized.email ?? '',
      address: normalized.address ?? '',
      enabled: normalized.enabled ?? true,
    });
  }
}
