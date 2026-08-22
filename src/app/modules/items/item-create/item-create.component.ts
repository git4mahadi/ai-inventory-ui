import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { ItemDto } from '../../../models/dto/ItemDto';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-item-create',
  standalone: false,
  templateUrl: './item-create.component.html',
  styleUrl: './item-create.component.scss',
})
export class ItemCreateComponent implements OnInit, OnDestroy {
  readonly itemForm: FormGroup;
  readonly storeTypeahead$ = new Subject<string>();
  readonly supplierTypeahead$ = new Subject<string>();
  readonly packSizeTypeahead$ = new Subject<string>();
  readonly locationTypeahead$ = new Subject<string>();

  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  packSizeOptions: LookupResponse[] = [];
  locationOptions: LookupResponse[] = [];

  loadingStores = false;
  loadingSuppliers = false;
  loadingPackSizes = false;
  loadingLocations = false;

  submitted = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly lookupApi: LookupApiService,
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
    this.setupStoreTypeahead();
    this.setupSupplierTypeahead();
    this.setupPackSizeTypeahead();
    this.setupLocationTypeahead();
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

  onSupplierOpen(): void {
    this.supplierTypeahead$.next('');
  }

  onPackSizeOpen(): void {
    this.packSizeTypeahead$.next('');
  }

  onLocationOpen(): void {
    this.locationTypeahead$.next('');
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.itemForm.invalid || this.loading) {
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
      .createItem(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Item created successfully');
          void this.router.navigate(['/items/list']);
        },
      });
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
    this.packSizeOptions = [];
    this.locationOptions = [];
    this.submitted = false;
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

  private setupPackSizeTypeahead(): void {
    this.packSizeTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchLookups(term, 'packSize')),
        takeUntil(this.destroy$),
      )
      .subscribe((lookups) => {
        this.packSizeOptions = lookups;
      });
  }

  private setupLocationTypeahead(): void {
    this.locationTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchLookups(term, 'location')),
        takeUntil(this.destroy$),
      )
      .subscribe((lookups) => {
        this.locationOptions = lookups;
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
    this.loadingSuppliers = true;
    return this.supplierApi
      .searchTerm(
        new SupplierSearchDto({
          searchTerm: term?.trim() || undefined,
          enabled: true,
        }),
      )
      .pipe(
        map((suppliers) => suppliers ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingSuppliers = false)),
      );
  }

  private searchLookups(term: string, kind: 'packSize' | 'location') {
    if (kind === 'packSize') {
      this.loadingPackSizes = true;
    } else {
      this.loadingLocations = true;
    }

    return this.lookupApi
      .searchTerm(
        new LookupSearchDto({
          searchTerm: term?.trim() || undefined,
          enabled: true,
        }),
      )
      .pipe(
        map((lookups) => lookups ?? []),
        catchError(() => of([])),
        finalize(() => {
          if (kind === 'packSize') {
            this.loadingPackSizes = false;
          } else {
            this.loadingLocations = false;
          }
        }),
      );
  }
}
