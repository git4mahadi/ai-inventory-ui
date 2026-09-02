import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectComponent } from '@ng-select/ng-select';
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
import { generateBatchNo } from '../../../core/utils/batch-no.util';
import { toApiDate } from '../../../core/utils/date.util';
import { roundMoney, toNumber } from '../../../core/utils/sales-cart.util';
import { OpeningStockDto } from '../../../models/dto/OpeningStockDto';
import { OpeningStockItemDto } from '../../../models/dto/OpeningStockItemDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { FinancialYearSearchDto } from '../../../models/search/FinancialYearSearchDto';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { FinancialYearApiService } from '../../../services/FinancialYearApiService';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { OpeningStockApiService } from '../../../services/OpeningStockApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

interface OpeningStockCartItem {
  lineId: string;
  itemId: string;
  itemName: string;
  itemCode?: string;
  stockQty: number;
  uomId: string | null;
  uomName?: string;
  batchNo: string;
  expireDate: Date | null;
  purchaseRate: number;
  salesRate: number;
  supplierId: string | null;
}

@Component({
  selector: 'app-opening-stock-create',
  standalone: false,
  templateUrl: './opening-stock-create.component.html',
  styleUrl: './opening-stock-create.component.scss',
})
export class OpeningStockCreateComponent implements OnInit, OnDestroy {
  @ViewChild('pickerItemSelect') pickerItemSelect?: NgSelectComponent;
  @ViewChild('pickerQuantityInput') pickerQuantityInput?: ElementRef<HTMLInputElement>;

  readonly openingStockForm: FormGroup;
  readonly pickerForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();
  readonly supplierTypeahead$ = new Subject<string>();
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };
  readonly expireDatePickerConfig: Partial<BsDatepickerConfig> = {
    ...this.datePickerConfig,
    startView: 'year',
  };

  storeOptions: StoreResponse[] = [];
  financialYearOptions: FinancialYearResponse[] = [];
  itemOptions: ItemResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  packSizeOptions: LookupResponse[] = [];
  cartItems: OpeningStockCartItem[] = [];

  loadingStores = false;
  loadingFinancialYears = false;
  loadingItems = false;
  loadingSuppliers = false;
  loadingLookups = false;
  submitted = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();
  private previousStoreId: string | null = null;
  private lineSeq = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly openingStockApi: OpeningStockApiService,
    private readonly storeApi: StoreApiService,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly itemApi: ItemApiService,
    private readonly lookupApi: LookupApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.openingStockForm = this.formBuilder.group({
      challanNo: ['', [Validators.maxLength(50)]],
      challanDate: [new Date(), Validators.required],
      financialYearId: [null as string | null, Validators.required],
      storeId: [null as string | null, Validators.required],
    });
    this.pickerForm = this.formBuilder.group({
      itemId: [null as string | null],
      purchaseRate: [{ value: null as number | null, disabled: true }],
      salesRate: [{ value: null as number | null, disabled: true }],
      currentStock: [{ value: null as number | null, disabled: true }],
      quantity: [null as number | null],
      expireDate: [null as Date | null],
    });
  }

  get f() {
    return this.openingStockForm.controls;
  }

  get purchaseTotal(): number {
    return roundMoney(
      this.cartItems.reduce(
        (sum, item) => sum + toNumber(item.stockQty) * toNumber(item.purchaseRate),
        0,
      ),
    );
  }

  get salesTotal(): number {
    return roundMoney(
      this.cartItems.reduce(
        (sum, item) => sum + toNumber(item.stockQty) * toNumber(item.salesRate),
        0,
      ),
    );
  }

  ngOnInit(): void {
    this.previousStoreId = this.openingStockForm.get('storeId')?.value ?? null;
    this.loadStores();
    this.loadFinancialYears();
    this.loadPackSizes();
    this.setupItemTypeahead();
    this.setupSupplierTypeahead();
    this.openingStockForm
      .get('storeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((storeId) => this.onStoreChange(storeId));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  fyLabel(financialYear: FinancialYearResponse): string {
    const code = financialYear.fyCode || financialYear.id || '';
    return financialYear.isCurrent ? `${code} (Current)` : code;
  }

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  supplierLabel(supplier: SupplierResponse): string {
    return supplier.supplierName || supplier.id || '';
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  itemStock(item: ItemResponse): number {
    return toNumber(item.currentStock);
  }

  linePurchaseTotal(item: OpeningStockCartItem): number {
    return roundMoney(toNumber(item.stockQty) * toNumber(item.purchaseRate));
  }

  onPickerItemChange(selected: string | ItemResponse | null): void {
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    const item =
      (typeof selected === 'object' && selected ? selected : null) ||
      this.itemOptions.find((option) => option.id === itemId) ||
      null;
    this.pickerForm.patchValue({
      purchaseRate: item?.purchaseRate ?? null,
      salesRate: item?.salesRate ?? null,
      currentStock: item?.currentStock ?? null,
      quantity: null,
    });
    if (item?.supplierId) {
      this.ensureSupplierOption(item.supplierId, item.supplierName);
    }
    if (item?.packSizeId) {
      this.ensurePackSizeOption(item.packSizeId, item.packSizeName);
    }
    if (itemId) {
      this.focusPickerQuantityInput();
    }
  }

  onPickerQuantityEnter(event: Event): void {
    event.preventDefault();
    this.addPickerItem();
  }

  addPickerItem(): void {
    const storeId = this.openingStockForm.get('storeId')?.value;
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

    const quantity = toNumber(this.pickerForm.get('quantity')?.value);
    if (quantity <= 0) {
      this.toastr.error('Enter a quantity');
      return;
    }

    const nextItem: OpeningStockCartItem = {
      lineId: `line-${++this.lineSeq}`,
      itemId,
      itemName: item.itemName || itemId,
      itemCode: item.itemCode,
      stockQty: quantity,
      uomId: item.packSizeId || null,
      uomName: item.packSizeName,
      batchNo: this.nextBatchNo(),
      expireDate: this.pickerForm.get('expireDate')?.value ?? null,
      purchaseRate: toNumber(item.purchaseRate),
      salesRate: toNumber(item.salesRate),
      supplierId: item.supplierId || null,
    };
    this.ensurePackSizeOption(item.packSizeId, item.packSizeName);
    this.ensureSupplierOption(item.supplierId, item.supplierName);
    this.cartItems = [...this.cartItems, nextItem];
    this.resetPicker(false);
    this.focusPickerItemSelect();
  }

  removeCartItem(index: number): void {
    this.cartItems = this.cartItems.filter((_, itemIndex) => itemIndex !== index);
  }

  onCartQtyChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.stockQty = Math.max(0, toNumber(value));
  }

  onCartRateChange(
    index: number,
    field: 'purchaseRate' | 'salesRate',
    value: number | string | null,
  ): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item[field] = Math.max(0, toNumber(value));
  }

  onCartExpireChange(index: number, value: Date | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.expireDate = value;
  }

  onCartUomChange(index: number, uomId: string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.uomId = uomId;
    item.uomName = this.resolveUomName(uomId);
  }

  onCartSupplierChange(index: number, supplierId: string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.supplierId = supplierId;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.openingStockForm.invalid || this.loading) {
      this.openingStockForm.markAllAsTouched();
      return;
    }
    if (!this.cartItems.length) {
      this.toastr.error('Add at least one item');
      return;
    }
    if (this.cartItems.some((item) => item.stockQty <= 0)) {
      this.toastr.error('Each cart item needs a quantity');
      return;
    }
    if (this.hasDuplicateItemBatch()) {
      this.toastr.error('Duplicate item and batch combination found in items');
      return;
    }

    const value = this.openingStockForm.value;
    if (!this.isChallanDateWithinFinancialYear(value.challanDate, value.financialYearId)) {
      this.toastr.error('Challan date must be within the selected financial year');
      return;
    }

    const dto = new OpeningStockDto({
      challanNo: value.challanNo?.trim() || undefined,
      challanDate: toApiDate(value.challanDate),
      financialYearId: value.financialYearId,
      storeId: value.storeId,
      items: this.cartItems.map(
        (item) =>
          new OpeningStockItemDto({
            supplierId: item.supplierId || undefined,
            itemId: item.itemId,
            itemName: item.itemName,
            stockQty: item.stockQty,
            uom: this.resolveUomName(item.uomId) || item.uomName,
            batchNo: item.batchNo,
            expireDate: toApiDate(item.expireDate),
            purchaseRate: item.purchaseRate,
            salesRate: item.salesRate,
          }),
      ),
    });

    this.loading = true;
    this.openingStockApi
      .createOpeningStock(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Opening stock created successfully');
          void this.router.navigate(['/opening-stocks/list']);
        },
      });
  }

  onClear(): void {
    this.openingStockForm.reset({
      challanNo: '',
      challanDate: new Date(),
      financialYearId: this.currentFinancialYearId(),
      storeId: this.defaultStoreId(),
    });
    this.cartItems = [];
    this.supplierOptions = [];
    this.resetPicker(true);
    this.submitted = false;
    this.previousStoreId = this.openingStockForm.get('storeId')?.value ?? null;
  }

  private onStoreChange(storeId: string | null): void {
    if (storeId === this.previousStoreId) {
      return;
    }
    const hadCart = this.cartItems.length > 0;
    this.cartItems = [];
    this.resetPicker(true);
    this.previousStoreId = storeId;
    if (hadCart) {
      this.toastr.info('Cart cleared because the store changed');
    }
  }

  private resetPicker(clearOptions: boolean): void {
    this.pickerForm.reset({
      itemId: null,
      purchaseRate: null,
      salesRate: null,
      currentStock: null,
      quantity: null,
      expireDate: null,
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

  private nextBatchNo(): string {
    return generateBatchNo(this.selectedStoreCode());
  }

  private selectedStoreCode(): string | null {
    const storeId = this.openingStockForm.get('storeId')?.value as string | null;
    if (!storeId) {
      return null;
    }
    return this.storeOptions.find((store) => store.id === storeId)?.storeCode ?? null;
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

  private setupSupplierTypeahead(): void {
    this.supplierTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchSuppliers(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((suppliers) => {
        this.supplierOptions = this.mergeOptions(this.selectedSupplierOptions(), suppliers);
      });
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
        this.storeOptions = stores ?? [];
        const defaultStoreId = this.defaultStoreId();
        if (defaultStoreId && !this.openingStockForm.get('storeId')?.value) {
          this.openingStockForm.patchValue({ storeId: defaultStoreId });
          this.previousStoreId = defaultStoreId;
        }
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
        this.packSizeOptions = lookupsByKey[LookupEnum.PACK_SIZE.key] ?? [];
      });
  }

  private loadFinancialYears(): void {
    this.loadingFinancialYears = true;
    this.financialYearApi
      .searchList(new FinancialYearSearchDto({ enabled: true }))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingFinancialYears = false)),
      )
      .subscribe((years) => {
        this.financialYearOptions = years ?? [];
        const currentId = this.currentFinancialYearId();
        if (currentId && !this.openingStockForm.get('financialYearId')?.value) {
          this.openingStockForm.patchValue({ financialYearId: currentId });
        }
      });
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    const storeId = this.openingStockForm.get('storeId')?.value as string | null;
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

  private searchSuppliers(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.selectedSupplierOptions());
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

  private selectedPickerItem(): ItemResponse[] {
    const selectedId = this.pickerForm.get('itemId')?.value as string | null;
    return this.itemOptions.filter((item) => item.id && item.id === selectedId);
  }

  private selectedSupplierOptions(): SupplierResponse[] {
    const selectedIds = this.cartItems
      .map((item) => item.supplierId)
      .filter((id): id is string => !!id);
    return this.supplierOptions.filter(
      (supplier) => supplier.id && selectedIds.includes(supplier.id),
    );
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

  private ensureSupplierOption(supplierId?: string, supplierName?: string): void {
    if (!supplierId || this.supplierOptions.some((supplier) => supplier.id === supplierId)) {
      return;
    }
    this.supplierOptions = [
      { id: supplierId, supplierName: supplierName || supplierId },
      ...this.supplierOptions,
    ];
  }

  private hasDuplicateItemBatch(): boolean {
    const keys = new Set<string>();
    for (const item of this.cartItems) {
      const batchNo = item.batchNo?.trim();
      if (!item.itemId || !batchNo) {
        continue;
      }
      const key = `${item.itemId}|${batchNo}`;
      if (keys.has(key)) {
        return true;
      }
      keys.add(key);
    }
    return false;
  }

  private isChallanDateWithinFinancialYear(
    challanDate: Date | string | null,
    financialYearId: string | null,
  ): boolean {
    const challan = toApiDate(challanDate);
    const fy = this.financialYearOptions.find((option) => option.id === financialYearId);
    if (!challan || !fy?.startDate || !fy?.endDate) {
      return true;
    }
    const start = fy.startDate.slice(0, 10);
    const end = fy.endDate.slice(0, 10);
    return challan >= start && challan <= end;
  }

  private currentFinancialYearId(): string | null {
    return this.financialYearOptions.find((fy) => fy.isCurrent)?.id ?? null;
  }

  private defaultStoreId(): string | null {
    const mainStore = this.storeOptions.find((store) => store.isMain);
    if (mainStore?.id) {
      return mainStore.id;
    }
    return this.storeOptions.length === 1 ? this.storeOptions[0].id ?? null : null;
  }
}
