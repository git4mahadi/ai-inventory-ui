import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizePage } from '../../../core/utils/api-response.util';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { LookupApiService } from '../../../services/LookupApiService';

@Component({
  selector: 'app-lookup-list',
  standalone: false,
  templateUrl: './lookup-list.component.html',
  styleUrl: './lookup-list.component.scss',
})
export class LookupListComponent implements OnInit {
  readonly searchForm: FormGroup;
  readonly lookupTypes = LookupEnum.enums;
  lookups: LookupResponse[] = [];
  loading = false;
  deletingId: string | null = null;
  pendingDelete: LookupResponse | null = null;

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly lookupApi: LookupApiService,
    private readonly toastr: ToastrService,
  ) {
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      lookupName: [''],
      lookupEnumKey: [null as string | null],
    });
  }

  ngOnInit(): void {
    this.loadLookups();
  }

  get emptyRowSlots(): number[] {
    const missing = Math.max(0, this.size - this.lookups.length);
    return Array.from({ length: missing }, (_, i) => i);
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the lookup and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.lookupName || this.pendingDelete?.id || '';
  }

  loadLookups(): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const request = new LookupSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      lookupName: formValue.lookupName?.trim() || undefined,
      lookupEnumKey: formValue.lookupEnumKey || undefined,
      page: this.page,
      size: this.size,
    });

    this.lookupApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<LookupResponse>(result);
          this.lookups = [...(page.content ?? [])];
          this.totalElements = page.totalElements ?? this.lookups.length;
          this.totalPages = page.totalPages ?? 1;
          this.page = page.number ?? this.page;
        },
        error: () => {
          this.lookups = [];
          this.totalElements = 0;
          this.totalPages = 0;
        },
      });
  }

  onSearch(): void {
    this.page = 0;
    this.loadLookups();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      lookupName: '',
      lookupEnumKey: null,
    });
    this.page = 0;
    this.loadLookups();
  }

  goToPage(nextPage: number): void {
    if (nextPage < 0 || nextPage >= this.totalPages || nextPage === this.page) {
      return;
    }
    this.page = nextPage;
    this.loadLookups();
  }

  requestDelete(lookup: LookupResponse): void {
    if (!lookup.id || this.deletingId) {
      return;
    }
    this.pendingDelete = lookup;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const lookup = this.pendingDelete;
    if (!lookup?.id) {
      return;
    }

    this.deletingId = lookup.id;
    this.lookupApi
      .deleteLookup(lookup.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Lookup deleted successfully');
          if (this.lookups.length === 1 && this.page > 0) {
            this.page -= 1;
          }
          this.loadLookups();
        },
      });
  }
}
