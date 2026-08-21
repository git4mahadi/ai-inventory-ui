import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { SupplierTypeEnum } from '../../../models/enums/SupplierTypeEnum';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-supplier-list',
  standalone: false,
  templateUrl: './supplier-list.component.html',
  styleUrl: './supplier-list.component.scss',
})
export class SupplierListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly supplierTypes = SupplierTypeEnum.enums;
  suppliers: SupplierResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: SupplierResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly supplierApi: SupplierApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      supplierName: [''],
      mobile: [''],
      supplierTypeEnumKey: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.loadSuppliers();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.suppliers.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the supplier and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.supplierName || this.pendingDelete?.id || '';
  }

  loadSuppliers(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new SupplierSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      supplierName: formValue.supplierName?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      supplierTypeEnumKey: formValue.supplierTypeEnumKey || undefined,
      page: this.page,
      size: this.size,
    });

    this.supplierApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<SupplierResponse>(result);
          this.suppliers = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.suppliers.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.suppliers = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadSuppliers();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      supplierName: '',
      mobile: '',
      supplierTypeEnumKey: null,
    });
    this.page = 0;
    this.loadSuppliers();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadSuppliers();
  }

  requestDelete(supplier: SupplierResponse): void {
    if (!supplier.id || this.deletingId) {
      return;
    }
    this.pendingDelete = supplier;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const supplier = this.pendingDelete;
    if (!supplier?.id) {
      return;
    }

    this.deletingId = supplier.id;
    this.supplierApi
      .deleteSupplier(supplier.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Supplier deleted successfully');
          if (this.suppliers.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadSuppliers();
        },
      });
  }
}
