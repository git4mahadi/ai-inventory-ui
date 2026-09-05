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
import { toApiDate } from '../../../core/utils/date.util';
import {
  calculatePurchaseOrderGrandTotal,
  calculatePurchaseOrderLineTotal,
} from '../../../core/utils/purchase-order-total.util';
import { roundMoney, toNumber } from '../../../core/utils/sales-cart.util';
import { PurchaseOrderDto } from '../../../models/dto/PurchaseOrderDto';
import { PurchaseOrderItemDto } from '../../../models/dto/PurchaseOrderItemDto';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { PurchaseOrderApiService } from '../../../services/PurchaseOrderApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

interface PurchaseOrderCartItem {
  itemId: string;
  itemName: string;
  itemCode?: string;
  orderedQty: number;
  unitPrice: number;
  currentStock?: number;
  discountPercent: number;
  taxPercent: number;
  remarks: string;
}

@Component({
  selector: 'app-purchase-order-create',
  standalone: false,
  templateUrl: './purchase-order-create.component.html',
  styleUrl: './purchase-order-create.component.scss',
})
export class PurchaseOrderCreateComponent implements OnInit, OnDestroy {
  @ViewChild('pickerItemSelect') pickerItemSelect?: NgSelectComponent;
  @ViewChild('pickerQuantityInput') pickerQuantityInput?: ElementRef<HTMLInputElement>;

  readonly purchaseOrderForm: FormGroup;
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

  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  cartItems: PurchaseOrderCartItem[] = [];

  loadingStores = false;
  loadingItems = false;
  loadingSuppliers = false;
  submitted = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();
  private previousStoreId: string | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly storeApi: StoreApiService,
    private readonly itemApi: ItemApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.purchaseOrderForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      supplierId: [null as string | null, Validators.required],
      orderDate: [new Date(), Validators.required],
      expectedDate: [null as Date | null],
      discountAmount: [null],
      taxAmount: [null],
      shippingCharge: [null],
      otherCharge: [null],
      remarks: ['', [Validators.maxLength(255)]],
    });
    this.pickerForm = this.formBuilder.group({
      itemId: [null as string | null],
      purchaseRate: [{ value: null as number | null, disabled: true }],
      salesRate: [{ value: null as number | null, disabled: true }],
      currentStock: [{ value: null as number | null, disabled: true }],
      quantity: [null as number | null],
    });
  }

  get f() {
    return this.purchaseOrderForm.controls;
  }

  get subTotal(): number {
    return roundMoney(
      this.cartItems.reduce((sum, item) => sum + calculatePurchaseOrderLineTotal(item), 0),
    );
  }

  get grandTotal(): number {
    const value = this.purchaseOrderForm.value;
    return roundMoney(
      calculatePurchaseOrderGrandTotal({
        subTotal: this.subTotal,
        discountAmount: value.discountAmount,
        taxAmount: value.taxAmount,
        shippingCharge: value.shippingCharge,
        otherCharge: value.otherCharge,
      }),
    );
  }

  ngOnInit(): void {
    this.previousStoreId = this.purchaseOrderForm.get('storeId')?.value ?? null;
    this.loadStores();
    this.setupItemTypeahead();
    this.setupSupplierTypeahead();
    this.purchaseOrderForm
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

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  supplierLabel(supplier: SupplierResponse): string {
    return supplier.supplierName || supplier.id || '';
  }

  itemStock(item: ItemResponse): number {
    return toNumber(item.currentStock);
  }

  lineTotal(item: PurchaseOrderCartItem): number {
    return roundMoney(calculatePurchaseOrderLineTotal(item));
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
    if (itemId) {
      this.focusPickerQuantityInput();
    }
  }

  onPickerQuantityEnter(event: Event): void {
    event.preventDefault();
    this.addPickerItem();
  }

  addPickerItem(): void {
    const storeId = this.purchaseOrderForm.get('storeId')?.value;
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

    const existing = this.cartItems.find((row) => row.itemId === itemId);
    if (existing) {
      existing.orderedQty = roundMoney(existing.orderedQty + quantity);
      existing.currentStock = toNumber(item.currentStock);
      this.cartItems = [...this.cartItems];
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          itemId,
          itemName: item.itemName || itemId,
          itemCode: item.itemCode,
          orderedQty: quantity,
          unitPrice: toNumber(item.purchaseRate),
          currentStock: toNumber(item.currentStock),
          discountPercent: 0,
          taxPercent: 0,
          remarks: '',
        },
      ];
    }

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
    item.orderedQty = Math.max(0, toNumber(value));
  }

  onCartPriceChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.unitPrice = Math.max(0, toNumber(value));
  }

  onCartPercentChange(
    index: number,
    field: 'discountPercent' | 'taxPercent',
    value: number | string | null,
  ): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item[field] = Math.max(0, toNumber(value));
  }

  onCartRemarksChange(index: number, value: string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.remarks = value ?? '';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.purchaseOrderForm.invalid || this.loading) {
      this.purchaseOrderForm.markAllAsTouched();
      if (!this.purchaseOrderForm.get('supplierId')?.value) {
        this.toastr.error('Select Supplier !!!');
      }
      return;
    }
    if (!this.cartItems.length) {
      this.toastr.error('Add at least one item');
      return;
    }
    if (this.cartItems.some((item) => item.orderedQty <= 0)) {
      this.toastr.error('Each cart item needs a quantity');
      return;
    }

    this.loading = true;
    this.purchaseOrderApi
      .createPurchaseOrder(this.buildDto())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Purchase order created successfully');
          void this.router.navigate(['/purchase-orders/list']);
        },
      });
  }

  onClear(): void {
    this.purchaseOrderForm.reset({
      storeId: this.defaultStoreId(),
      supplierId: null,
      orderDate: new Date(),
      expectedDate: null,
      discountAmount: null,
      taxAmount: null,
      shippingCharge: null,
      otherCharge: null,
      remarks: '',
    });
    this.cartItems = [];
    this.supplierOptions = [];
    this.resetPicker(true);
    this.submitted = false;
    this.previousStoreId = this.purchaseOrderForm.get('storeId')?.value ?? null;
  }

  private buildDto(): PurchaseOrderDto {
    const value = this.purchaseOrderForm.value;
    const items = this.cartItems.map(
      (item) =>
        new PurchaseOrderItemDto({
          itemId: item.itemId,
          orderedQty: item.orderedQty,
          receivedQty: 0,
          unitPrice: item.unitPrice,
          discountPercent: toNumber(item.discountPercent),
          discountAmount: 0,
          taxPercent: toNumber(item.taxPercent),
          taxAmount: 0,
          remarks: item.remarks?.trim() || undefined,
        }),
    );

    return new PurchaseOrderDto({
      orderDate: toApiDate(value.orderDate),
      expectedDate: toApiDate(value.expectedDate),
      storeId: value.storeId,
      supplierId: value.supplierId,
      subTotal: this.subTotal,
      discountAmount: toNumber(value.discountAmount),
      taxAmount: toNumber(value.taxAmount),
      shippingCharge: toNumber(value.shippingCharge),
      otherCharge: toNumber(value.otherCharge),
      grandTotal: this.grandTotal,
      remarks: value.remarks?.trim() || undefined,
      items,
    });
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
        if (defaultStoreId && !this.purchaseOrderForm.get('storeId')?.value) {
          this.purchaseOrderForm.patchValue({ storeId: defaultStoreId });
          this.previousStoreId = defaultStoreId;
        }
      });
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    const storeId = this.purchaseOrderForm.get('storeId')?.value as string | null;
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
    const selectedId = this.purchaseOrderForm.get('supplierId')?.value as string | null;
    return this.supplierOptions.filter(
      (supplier) => supplier.id && supplier.id === selectedId,
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

  private defaultStoreId(): string | null {
    const mainStore = this.storeOptions.find((store) => store.isMain);
    if (mainStore?.id) {
      return mainStore.id;
    }
    return this.storeOptions.length === 1 ? this.storeOptions[0].id ?? null : null;
  }
}
