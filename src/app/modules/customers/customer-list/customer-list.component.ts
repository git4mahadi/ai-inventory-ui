import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { CustomerSearchDto } from '../../../models/search/CustomerSearchDto';
import { CustomerApiService } from '../../../services/CustomerApiService';

@Component({
  selector: 'app-customer-list',
  standalone: false,
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss',
})
export class CustomerListComponent implements OnInit {
  readonly searchForm: FormGroup;
  customers: CustomerResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: CustomerResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly customerApi: CustomerApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      customerName: [''],
      mobile: [''],
      email: [''],
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.customers.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the customer and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.customerName || this.pendingDelete?.id || '';
  }

  loadCustomers(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new CustomerSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      customerName: formValue.customerName?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      email: formValue.email?.trim() || undefined,
      page: this.page,
      size: this.size,
    });

    this.customerApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<CustomerResponse>(result);
          this.customers = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.customers.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.customers = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadCustomers();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      customerName: '',
      mobile: '',
      email: '',
    });
    this.page = 0;
    this.loadCustomers();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadCustomers();
  }

  requestDelete(customer: CustomerResponse): void {
    if (!customer.id || this.deletingId) {
      return;
    }
    this.pendingDelete = customer;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const customer = this.pendingDelete;
    if (!customer?.id) {
      return;
    }

    this.deletingId = customer.id;
    this.customerApi
      .deleteCustomer(customer.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Customer deleted successfully');
          if (this.customers.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadCustomers();
        },
      });
  }
}
