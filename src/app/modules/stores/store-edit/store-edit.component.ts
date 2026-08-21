import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { normalizeStore } from '../../../core/utils/api-response.util';
import { StoreDto } from '../../../models/dto/StoreDto';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-store-edit',
  standalone: false,
  templateUrl: './store-edit.component.html',
  styleUrl: './store-edit.component.scss',
})
export class StoreEditComponent implements OnInit {
  readonly storeForm: FormGroup;
  submitted = false;
  loading = false;
  loadingStore = true;
  storeId = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly storeApi: StoreApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.storeForm = this.formBuilder.group({
      storeName: ['', [Validators.required, Validators.maxLength(100)]],
      storeCode: ['', [Validators.required, Validators.maxLength(20)]],
      mobile: ['', [Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(250)]],
      isMain: [false],
      enabled: [true],
    });
  }

  get f() {
    return this.storeForm.controls;
  }

  ngOnInit(): void {
    this.storeId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.storeId) {
      this.toastr.error('Store id is missing');
      void this.router.navigate(['/stores/list']);
      return;
    }

    const stateStore = normalizeStore(
      (history.state?.['store'] as StoreResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.['store'],
    );
    if (stateStore) {
      this.patchForm(stateStore);
      this.loadingStore = false;
    }

    this.loadStore();
  }

  onClear(): void {
    this.storeForm.reset({
      storeName: '',
      storeCode: '',
      mobile: '',
      address: '',
      isMain: false,
      enabled: true,
    });
    this.submitted = false;
  }

  loadStore(): void {
    if (!this.storeForm.get('storeName')?.value) {
      this.loadingStore = true;
    }

    this.storeApi
      .getStoreById(this.storeId)
      .pipe(finalize(() => (this.loadingStore = false)))
      .subscribe({
        next: (store) => {
          this.patchForm(store);
        },
        error: () => {
          if (!this.storeForm.get('storeName')?.value) {
            void this.router.navigate(['/stores/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.storeForm.invalid || this.loading || !this.storeId) {
      return;
    }

    const dto = new StoreDto({
      storeName: this.storeForm.value.storeName?.trim(),
      storeCode: this.storeForm.value.storeCode?.trim(),
      mobile: this.storeForm.value.mobile?.trim() || undefined,
      address: this.storeForm.value.address?.trim() || undefined,
      isMain: !!this.storeForm.value.isMain,
      enabled: !!this.storeForm.value.enabled,
    });

    this.loading = true;
    this.storeApi
      .updateStore(this.storeId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Store updated successfully');
          void this.router.navigate(['/stores/list']);
        },
      });
  }

  private patchForm(store: StoreResponse): void {
    const normalized = normalizeStore(store);
    if (!normalized) {
      return;
    }

    this.storeForm.patchValue({
      storeName: normalized.storeName ?? '',
      storeCode: normalized.storeCode ?? '',
      mobile: normalized.mobile ?? '',
      address: normalized.address ?? '',
      isMain: !!normalized.isMain,
      enabled: normalized.enabled ?? true,
    });
  }
}
