import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';

@Component({
  selector: 'app-item-list',
  standalone: false,
  templateUrl: './item-list.component.html',
  styleUrl: './item-list.component.scss',
})
export class ItemListComponent implements OnInit {
  readonly searchForm: FormGroup;
  items: ItemResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: ItemResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      itemName: [''],
      itemCode: [''],
      itemBarcode: [''],
    });
  }

  ngOnInit(): void {
    this.loadItems();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.items.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the item and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.itemName || this.pendingDelete?.id || '';
  }

  loadItems(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new ItemSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      itemName: formValue.itemName?.trim() || undefined,
      itemCode: formValue.itemCode?.trim() || undefined,
      itemBarcode: formValue.itemBarcode?.trim() || undefined,
      page: this.page,
      size: this.size,
    });

    this.itemApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ItemResponse>(result);
          this.items = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.items.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.items = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadItems();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      itemName: '',
      itemCode: '',
      itemBarcode: '',
    });
    this.page = 0;
    this.loadItems();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadItems();
  }

  requestDelete(item: ItemResponse): void {
    if (!item.id || this.deletingId) {
      return;
    }
    this.pendingDelete = item;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const item = this.pendingDelete;
    if (!item?.id) {
      return;
    }

    this.deletingId = item.id;
    this.itemApi
      .deleteItem(item.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Item deleted successfully');
          if (this.items.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadItems();
        },
      });
  }
}
