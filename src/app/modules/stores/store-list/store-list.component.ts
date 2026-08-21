import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-store-list',
  standalone: false,
  templateUrl: './store-list.component.html',
  styleUrl: './store-list.component.scss',
})
export class StoreListComponent implements OnInit {
  readonly searchForm: FormGroup;
  stores: StoreResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: StoreResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      storeName: [''],
      storeCode: [''],
      mobile: [''],
    });
  }

  ngOnInit(): void {
    this.loadStores();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.stores.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the store and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.storeName || this.pendingDelete?.id || '';
  }

  loadStores(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new StoreSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      storeName: formValue.storeName?.trim() || undefined,
      storeCode: formValue.storeCode?.trim() || undefined,
      mobile: formValue.mobile?.trim() || undefined,
      page: this.page,
      size: this.size,
    });

    this.storeApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<StoreResponse>(result);
          this.stores = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.stores.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.stores = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadStores();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      storeName: '',
      storeCode: '',
      mobile: '',
    });
    this.page = 0;
    this.loadStores();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadStores();
  }

  requestDelete(store: StoreResponse): void {
    if (!store.id || this.deletingId) {
      return;
    }
    this.pendingDelete = store;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const store = this.pendingDelete;
    if (!store?.id) {
      return;
    }

    this.deletingId = store.id;
    this.storeApi
      .deleteStore(store.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Store deleted successfully');
          if (this.stores.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadStores();
        },
      });
  }
}
