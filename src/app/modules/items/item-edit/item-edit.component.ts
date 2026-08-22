import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { normalizeItem } from '../../../core/utils/api-response.util';
import { ItemDto } from '../../../models/dto/ItemDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-item-edit',
  standalone: false,
  templateUrl: './item-edit.component.html',
  styleUrl: './item-edit.component.scss',
})
export class ItemEditComponent implements OnInit, OnDestroy {
  readonly itemForm: FormGroup;
  readonly storeTypeahead$ = new Subject<string>();
  readonly supplierTypeahead$ = new Subject<string>();

  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  packSizeOptions: LookupResponse[] = [];
  locationOptions: LookupResponse[] = [];

  loadingStores = false;
  loadingSuppliers = false;
  loadingLookups = false;

  submitted = false;
  loading = false;
  loadingItem = true;
  itemId = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.itemForm = this.formBuilder.group({
      itemName: ['', [Validators.required, Validators.maxLength(255)]],
      itemCode: ['', [Validators.required, Validators.maxLength(20)]],
      itemBarcode: ['', [Validators.maxLength(20)]],
      strength: ['', [Validators.maxLength(50)]],
      storeId: [null as string | null, Validators.required],
      supplierId: [null as string | null],
      packSizeId: [null as string | null],
      locationId: [null as string | null],
      purchaseRate: [0, [Validators.required, Validators.min(0)]],
      salesRate: [0, [Validators.required, Validators.min(0)]],
      reOrderLevel: [0, [Validators.min(0)]],
      expireNotifyDays: [0, [Validators.min(0)]],
      isForeignItem: [false],
      enabled: [true],
    });
  }

  get f() {
    return this.itemForm.controls;
  }

  ngOnInit(): void {
    this.itemId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.itemId) {
      this.toastr.error('Item id is missing');
      void this.router.navigate(['/items/list']);
      return;
    }

    this.setupStoreTypeahead();
    this.setupSupplierTypeahead();
    this.loadPackSizeAndLocationOptions();

    const stateItem = normalizeItem(
      (history.state?.['item'] as ItemResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.['item'],
    );
    if (stateItem) {
      this.patchForm(stateItem);
      this.loadingItem = false;
    }

    this.loadItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  supplierLabel(supplier: SupplierResponse): string {
    return supplier.supplierName || supplier.id || '';
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  onStoreOpen(): void {
    this.storeTypeahead$.next('');
  }

  onClear(): void {
    this.itemForm.reset({
      itemName: '',
      itemCode: '',
      itemBarcode: '',
      strength: '',
      storeId: null,
      supplierId: null,
      packSizeId: null,
      locationId: null,
      purchaseRate: 0,
      salesRate: 0,
      reOrderLevel: 0,
      expireNotifyDays: 0,
      isForeignItem: false,
      enabled: true,
    });
    this.storeOptions = [];
    this.supplierOptions = [];
  }

  loadItem(): void {
    if (!this.itemForm.get('itemName')?.value) {
      this.loadingItem = true;
    }

    this.itemApi
      .getItemById(this.itemId)
      .pipe(finalize(() => (this.loadingItem = false)))
      .subscribe({
        next: (item) => {
          this.patchForm(item);
        },
        error: () => {
          if (!this.itemForm.get('itemName')?.value) {
            void this.router.navigate(['/items/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.itemForm.invalid || this.loading || !this.itemId) {
      return;
    }

    const value = this.itemForm.value;
    const dto = new ItemDto({
      itemName: value.itemName?.trim(),
      itemCode: value.itemCode?.trim(),
      itemBarcode: value.itemBarcode?.trim() || undefined,
      strength: value.strength?.trim() || undefined,
      storeId: value.storeId,
      supplierId: value.supplierId || undefined,
      packSizeId: value.packSizeId || undefined,
      locationId: value.locationId || undefined,
      purchaseRate: Number(value.purchaseRate),
      salesRate: Number(value.salesRate),
      reOrderLevel: Number(value.reOrderLevel ?? 0),
      expireNotifyDays: Number(value.expireNotifyDays ?? 0),
      isForeignItem: !!value.isForeignItem,
      enabled: !!value.enabled,
    });

    this.loading = true;
    this.itemApi
      .updateItem(this.itemId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Item updated successfully');
          void this.router.navigate(['/items/list']);
        },
      });
  }

  private setupStoreTypeahead(): void {
    this.storeTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchStores(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((stores) => {
        this.storeOptions = stores;
      });
  }

  private setupSupplierTypeahead(): void {
    this.supplierTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchSuppliers(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((suppliers) => {
        this.supplierOptions = suppliers;
      });
  }

  private loadPackSizeAndLocationOptions(): void {
    this.loadingLookups = true;
    this.lookupApi
      .getLookupListByKeys([LookupEnum.PACK_SIZE.key, LookupEnum.LOCATION.key])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingLookups = false)),
      )
      .subscribe((lookupsByKey) => {
        this.packSizeOptions = lookupsByKey[LookupEnum.PACK_SIZE.key] ?? [];
        this.locationOptions = lookupsByKey[LookupEnum.LOCATION.key] ?? [];
      });
  }

  private searchStores(term: string) {
    this.loadingStores = true;
    return this.storeApi
      .searchTerm(
        new StoreSearchDto({
          searchTerm: term?.trim() || undefined,
          enabled: true,
        }),
      )
      .pipe(
        map((stores) => stores ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingStores = false)),
      );
  }

  private searchSuppliers(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.supplierOptions);
    }

    this.loadingSuppliers = true;
    return this.supplierApi
      .searchTerm(
        new SupplierSearchDto({
          searchTerm,
          enabled: true,
        }),
      )
      .pipe(
        map((suppliers) => suppliers ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingSuppliers = false)),
      );
  }

  private patchForm(item: ItemResponse): void {
    const normalized = normalizeItem(item);
    if (!normalized) {
      return;
    }

    this.itemForm.patchValue(
      {
        itemName: normalized.itemName ?? '',
        itemCode: normalized.itemCode ?? '',
        itemBarcode: normalized.itemBarcode ?? '',
        strength: normalized.strength ?? '',
        storeId: normalized.storeId ?? null,
        supplierId: normalized.supplierId ?? null,
        packSizeId: normalized.packSizeId ?? null,
        locationId: normalized.locationId ?? null,
        purchaseRate: normalized.purchaseRate ?? 0,
        salesRate: normalized.salesRate ?? 0,
        reOrderLevel: normalized.reOrderLevel ?? 0,
        expireNotifyDays: normalized.expireNotifyDays ?? 0,
        isForeignItem: normalized.isForeignItem ?? false,
        enabled: normalized.enabled ?? true,
      },
      { emitEvent: false },
    );

    this.ensureSelectedRelations(normalized);
  }

  private ensureSelectedRelations(item: ItemResponse): void {
    if (item.storeId && !this.storeOptions.some((store) => store.id === item.storeId)) {
      this.storeApi.getStoreById(item.storeId).subscribe({
        next: (store) => {
          if (store?.id) {
            this.storeOptions = [store, ...this.storeOptions];
          }
        },
      });
    }

    if (
      item.supplierId &&
      !this.supplierOptions.some((supplier) => supplier.id === item.supplierId)
    ) {
      if (item.supplierName) {
        this.supplierOptions = [
          {
            id: item.supplierId,
            supplierName: item.supplierName,
          },
          ...this.supplierOptions,
        ];
      } else {
        this.supplierApi.getSupplierById(item.supplierId).subscribe({
          next: (supplier) => {
            if (supplier?.id) {
              this.supplierOptions = [supplier, ...this.supplierOptions];
            }
          },
        });
      }
    }

    if (
      item.packSizeId &&
      !this.packSizeOptions.some((lookup) => lookup.id === item.packSizeId)
    ) {
      this.packSizeOptions = [
        {
          id: item.packSizeId,
          lookupName: item.packSizeName,
        },
        ...this.packSizeOptions,
      ];
    }

    if (
      item.locationId &&
      !this.locationOptions.some((lookup) => lookup.id === item.locationId)
    ) {
      this.locationOptions = [
        {
          id: item.locationId,
          lookupName: item.locationName,
        },
        ...this.locationOptions,
      ];
    }
  }
}
