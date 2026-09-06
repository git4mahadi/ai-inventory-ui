import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
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
import { NgSelectComponent } from '@ng-select/ng-select';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import {
  ReconcileCartItem,
  reconcileCartKey,
  reconcileCartTotals,
  roundQty,
  toNumber,
} from '../../../core/utils/reconcile-cart.util';
import { onDecimalKeydown, sanitizeDecimalInput } from '../../../core/utils/sales-cart.util';
import { ReconcileStockDto } from '../../../models/dto/ReconcileStockDto';
import { ReconcileStockItemDto } from '../../../models/dto/ReconcileStockItemDto';
import {
  RECONCILE_TYPES,
  ReconcileType,
  reconcileTypeLabel,
} from '../../../models/enums/ReconcileType';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { ReconcileStockItemResponse } from '../../../models/response/ReconcileStockItemResponse';
import { ReconcileStockResponse } from '../../../models/response/ReconcileStockResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { ReconcileStockApiService } from '../../../services/ReconcileStockApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-reconcile-stock-edit',
  standalone: false,
  templateUrl: './reconcile-stock-edit.component.html',
  styleUrl: './reconcile-stock-edit.component.scss',
})
export class ReconcileStockEditComponent implements OnInit, OnDestroy {
  @ViewChild('pickerItemSelect') pickerItemSelect?: NgSelectComponent;
  @ViewChild('pickerQuantityInput') pickerQuantityInput?: ElementRef<HTMLInputElement>;

  readonly reconcileForm: FormGroup;
  readonly pickerForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();
  readonly reconcileTypes = RECONCILE_TYPES;
  readonly onDecimalKeydown = onDecimalKeydown;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];
  packSizeOptions: LookupResponse[] = [];
  cartItems: ReconcileCartItem[] = [];

  loadingStores = false;
  loadingItems = false;
  loadingLookups = false;
  loadingRecord = true;
  submitted = false;
  loading = false;
  reconcileStockId = '';
  reconcileStockNcId = '';

  private readonly destroy$ = new Subject<void>();
  private previousStoreId: string | null = null;
  private hydrating = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly reconcileStockApi: ReconcileStockApiService,
    private readonly storeApi: StoreApiService,
    private readonly itemApi: ItemApiService,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.reconcileForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      reconcileDate: [null as Date | null, Validators.required],
    });
    this.pickerForm = this.formBuilder.group({
      itemId: [null as string | null],
      reconcileTypeEnumKey: ['WRITE_OFF' as ReconcileType],
      currentStock: [{ value: null as number | null, disabled: true }],
      reconcileQty: [null as number | null],
    });
  }

  get f() {
    return this.reconcileForm.controls;
  }

  get totals() {
    return reconcileCartTotals(this.cartItems);
  }

  ngOnInit(): void {
    this.reconcileStockId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.reconcileStockId) {
      this.toastr.error('Stock reconcile id is missing');
      void this.router.navigate(['/reconcile-stocks/list']);
      return;
    }

    this.previousStoreId = this.reconcileForm.get('storeId')?.value ?? null;
    this.loadStores();
    this.loadPackSizes();
    this.setupItemTypeahead();
    this.reconcileForm
      .get('storeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((storeId) => this.onStoreChange(storeId));
    this.loadReconcileStock();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  typeLabel(type: ReconcileType): string {
    return reconcileTypeLabel(type);
  }

  itemStock(item: ItemResponse): number {
    return toNumber(item.currentStock);
  }

  cartTrack(item: ReconcileCartItem): string {
    return reconcileCartKey(item);
  }

  onPickerItemChange(selected: string | ItemResponse | null): void {
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    const item =
      (typeof selected === 'object' && selected ? selected : null) ||
      this.itemOptions.find((option) => option.id === itemId) ||
      null;
    this.pickerForm.patchValue({
      currentStock: item?.currentStock ?? null,
      reconcileQty: null,
    });
    this.ensurePackSizeOption(item?.packSizeId, item?.packSizeName);
    if (itemId) {
      this.focusPickerQuantityInput();
    }
  }

  onPickerQuantityEnter(event: Event): void {
    event.preventDefault();
    this.addPickerItem();
  }

  addPickerItem(): void {
    const storeId = this.reconcileForm.get('storeId')?.value;
    if (!storeId) {
      this.toastr.error('Select a store first');
      return;
    }

    const itemId = this.pickerForm.get('itemId')?.value as string | null;
    const item = this.itemOptions.find((option) => option.id === itemId);
    if (!itemId || !item) {
      this.toastr.error('Select an item');
      return;
    }

    const quantity = toNumber(this.pickerForm.get('reconcileQty')?.value);
    if (quantity <= 0) {
      this.toastr.error('Enter a quantity');
      return;
    }

    const type = (this.pickerForm.get('reconcileTypeEnumKey')?.value ||
      'WRITE_OFF') as ReconcileType;
    const key = reconcileCartKey({ itemId, batchNo: '' });
    if (this.cartItems.some((row) => reconcileCartKey(row) === key)) {
      this.toastr.error('Duplicate item found in items');
      return;
    }

    const uomId = item.packSizeId || this.resolveUomId(item.packSizeName) || null;
    const qty = roundQty(quantity);
    const nextItem: ReconcileCartItem = {
      itemId,
      itemName: item.itemName || itemId,
      itemCode: item.itemCode,
      reconcileTypeEnumKey: type,
      reconcileQty: qty,
      qtyInput: String(qty),
      uom: this.resolveUomName(uomId) || item.packSizeName,
      uomId,
      batchNo: '',
      expireDate: null,
      remarks: '',
      currentStock: toNumber(item.currentStock),
    };
    this.cartItems = [...this.cartItems, nextItem];
    this.resetPicker(false);
    this.focusPickerItemSelect();
  }

  removeCartItem(index: number): void {
    this.cartItems = this.cartItems.filter((_, itemIndex) => itemIndex !== index);
  }

  onCartTypeChange(index: number, value: ReconcileType): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.reconcileTypeEnumKey = value;
  }

  onCartQtyChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    const sanitized = sanitizeDecimalInput(String(value ?? ''));
    item.qtyInput = sanitized;
    item.reconcileQty =
      sanitized === '' || sanitized === '.' ? 0 : Math.max(0, toNumber(sanitized));
  }

  onCartRemarksChange(index: number, value: string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.remarks = String(value || '').trim();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.reconcileForm.invalid) {
      this.reconcileForm.markAllAsTouched();
      return;
    }
    if (!this.cartItems.length) {
      this.toastr.error('Add at least one item');
      return;
    }
    if (this.cartItems.some((item) => item.reconcileQty <= 0)) {
      this.toastr.error('Each item needs a quantity greater than zero');
      return;
    }
    if (this.hasDuplicateItemBatch()) {
      this.toastr.error('Duplicate item found in items');
      return;
    }

    this.loading = true;
    this.reconcileStockApi
      .updateReconcileStock(this.reconcileStockId, this.buildDto())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Stock reconcile updated successfully');
          void this.router.navigate(['/reconcile-stocks/list']);
        },
      });
  }

  onCancel(): void {
    void this.router.navigate(['/reconcile-stocks/list']);
  }

  private buildDto(): ReconcileStockDto {
    const value = this.reconcileForm.getRawValue();
    const items = this.cartItems.map(
      (item) =>
        new ReconcileStockItemDto({
          itemId: item.itemId,
          reconcileTypeEnumKey: item.reconcileTypeEnumKey,
          reconcileQty: roundQty(item.reconcileQty),
          uom: item.uom || this.resolveUomName(item.uomId ?? null),
          batchNo: item.batchNo?.trim() || undefined,
          expireDate: toApiDate(item.expireDate),
          remarks: item.remarks?.trim() || undefined,
        }),
    );

    return new ReconcileStockDto({
      reconcileDate: toApiDate(value.reconcileDate),
      storeId: value.storeId,
      items,
    });
  }

  private onStoreChange(storeId: string | null): void {
    if (this.hydrating || storeId === this.previousStoreId) {
      return;
    }
    const hadCart = this.cartItems.length > 0;
    this.cartItems = [];
    this.resetPicker(true);
    this.previousStoreId = storeId;
    if (hadCart) {
      this.toastr.info('Items cleared because the store changed');
    }
  }

  private resetPicker(clearOptions: boolean): void {
    this.pickerForm.reset({
      itemId: null,
      reconcileTypeEnumKey: 'WRITE_OFF',
      currentStock: null,
      reconcileQty: null,
    });
    if (clearOptions) {
      this.itemOptions = [];
    }
  }

  private focusPickerItemSelect(): void {
    setTimeout(() => {
      this.pickerItemSelect?.focus();
      this.pickerItemSelect?.open();
    });
  }

  private focusPickerQuantityInput(): void {
    setTimeout(() => {
      this.pickerQuantityInput?.nativeElement.focus();
    });
  }

  private setupItemTypeahead(): void {
    this.itemTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchItems(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((items) => {
        this.itemOptions = this.mergeOptions(this.selectedPickerItem(), items);
      });
  }

  private loadReconcileStock(): void {
    this.loadingRecord = true;
    this.reconcileStockApi
      .getReconcileStockById(this.reconcileStockId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingRecord = false)),
      )
      .subscribe({
        next: (record) => this.patchRecord(record),
        error: () => {
          void this.router.navigate(['/reconcile-stocks/list']);
        },
      });
  }

  private patchRecord(record: ReconcileStockResponse): void {
    this.hydrating = true;
    this.reconcileStockNcId = record.reconcileStockNcId || '';
    this.previousStoreId = record.storeId ?? null;
    this.ensureStoreOption(record);
    this.reconcileForm.patchValue({
      storeId: record.storeId ?? null,
      reconcileDate: toDatePickerValue(record.reconcileDate),
    });
    this.cartItems = (record.items ?? [])
      .filter((item): item is ReconcileStockItemResponse & { itemId: string } => !!item.itemId)
      .map((item) => this.toCartItem(item));
    this.hydrating = false;
  }

  private toCartItem(item: ReconcileStockItemResponse): ReconcileCartItem {
    const type = (item.reconcileTypeEnumKey === 'WRITE_ON' ? 'WRITE_ON' : 'WRITE_OFF') as ReconcileType;
    const uomId = this.resolveUomId(item.uom) || null;
    const qty = roundQty(toNumber(item.reconcileQty));
    if (item.uom) {
      this.ensurePackSizeOption(uomId ?? item.uom, item.uom);
    }
    return {
      itemId: item.itemId || '',
      itemName: item.itemName || item.itemId || '',
      reconcileTypeEnumKey: type,
      reconcileQty: qty,
      qtyInput: String(qty),
      uom: item.uom,
      uomId,
      batchNo: item.batchNo || '',
      expireDate: toDatePickerValue(item.expireDate),
      remarks: item.remarks || '',
    };
  }

  private ensureStoreOption(record: ReconcileStockResponse): void {
    if (!record.storeId || this.storeOptions.some((store) => store.id === record.storeId)) {
      return;
    }
    this.storeOptions = [
      { id: record.storeId, storeName: record.storeName || record.storeId },
      ...this.storeOptions,
    ];
  }

  private loadStores(): void {
    this.loadingStores = true;
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingStores = false)),
      )
      .subscribe((stores) => {
        this.storeOptions = this.mergeOptions(this.storeOptions, stores ?? []);
      });
  }

  private loadPackSizes(): void {
    this.loadingLookups = true;
    this.lookupApi
      .getLookupListByKeys([LookupEnum.PACK_SIZE.key])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingLookups = false)),
      )
      .subscribe((lookupsByKey) => {
        this.packSizeOptions = this.mergeOptions(
          this.packSizeOptions,
          lookupsByKey[LookupEnum.PACK_SIZE.key] ?? [],
        );
      });
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    const storeId = this.reconcileForm.get('storeId')?.value as string | null;
    if (!storeId) {
      return of(this.selectedPickerItem());
    }
    if (!searchTerm || searchTerm.length < 2) {
      return of(this.selectedPickerItem());
    }

    this.loadingItems = true;
    return this.itemApi
      .searchTermWithStock(
        new ItemSearchDto({
          searchTerm,
          storeId,
          enabled: true,
        }),
      )
      .pipe(
        map((items) => items ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingItems = false)),
      );
  }

  private selectedPickerItem(): ItemResponse[] {
    const selectedId = this.pickerForm.get('itemId')?.value as string | null;
    return this.itemOptions.filter((item) => item.id && item.id === selectedId);
  }

  private mergeOptions<T extends { id?: string }>(kept: T[], incoming: T[]): T[] {
    const map = new Map<string, T>();
    for (const option of [...kept, ...incoming]) {
      if (option.id) {
        map.set(option.id, option);
      }
    }
    return [...map.values()];
  }

  private resolveUomId(uom?: string): string | null {
    if (!uom) {
      return null;
    }
    const match = this.packSizeOptions.find(
      (lookup) =>
        lookup.id === uom ||
        lookup.lookupName === uom ||
        lookup.parentFullName === uom,
    );
    return match?.id ?? null;
  }

  private resolveUomName(uomId: string | null): string | undefined {
    if (!uomId) {
      return undefined;
    }
    const lookup = this.packSizeOptions.find((option) => option.id === uomId);
    if (lookup) {
      return this.lookupLabel(lookup);
    }
    return uomId;
  }

  private ensurePackSizeOption(packSizeId?: string, packSizeName?: string): void {
    if (!packSizeId || this.packSizeOptions.some((lookup) => lookup.id === packSizeId)) {
      return;
    }
    this.packSizeOptions = [
      { id: packSizeId, lookupName: packSizeName || packSizeId },
      ...this.packSizeOptions,
    ];
  }

  private hasDuplicateItemBatch(): boolean {
    const keys = new Set<string>();
    for (const item of this.cartItems) {
      if (!item.itemId) {
        continue;
      }
      const key = reconcileCartKey(item);
      if (keys.has(key)) {
        return true;
      }
      keys.add(key);
    }
    return false;
  }
}
