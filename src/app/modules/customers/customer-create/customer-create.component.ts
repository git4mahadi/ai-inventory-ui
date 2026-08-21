import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { CustomerDto } from '../../../models/dto/CustomerDto';
import { CustomerApiService } from '../../../services/CustomerApiService';

@Component({
  selector: 'app-customer-create',
  standalone: false,
  templateUrl: './customer-create.component.html',
  styleUrl: './customer-create.component.scss',
})
export class CustomerCreateComponent {
  readonly customerForm: FormGroup;
  submitted = false;
  loading = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customerApi: CustomerApiService,
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

  onSubmit(): void {
    this.submitted = true;
    if (this.customerForm.invalid || this.loading) {
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
      .createCustomer(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Customer created successfully');
          void this.router.navigate(['/customers/list']);
        },
      });
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
}
