import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import {
  SalesCartItem,
  distributeSalesDiscount,
  roundMoney,
  salesCartTotals,
  salesLineGross,
  salesLineTotal,
  toNumber,
} from '../../../core/utils/sales-cart.util';
import { SalesDto } from '../../../models/dto/SalesDto';
import { SalesItemDto } from '../../../models/dto/SalesItemDto';
import {
  PAYMENT_METHODS,
  PaymentMethod,
  isSalesEditable,
  paymentMethodLabel,
  salesStatusLabel,
} from '../../../models/enums/SalesStatus';
import { CustomerResponse } from '../../../models/response/CustomerResponse';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { SalesItemResponse } from '../../../models/response/SalesItemResponse';
import { SalesResponse } from '../../../models/response/SalesResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { CustomerSearchDto } from '../../../models/search/CustomerSearchDto';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { CustomerApiService } from '../../../services/CustomerApiService';
import { ItemApiService } from '../../../services/ItemApiService';
import { SalesApiService } from '../../../services/SalesApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-sales-edit',
  standalone: false,
  templateUrl: './sales-edit.component.html',
  styleUrl: './sales-edit.component.scss',
})
export class SalesEditComponent implements OnInit, OnDestroy {
  readonly salesForm: FormGroup;
  readonly pickerForm: FormGroup;
  readonly customerTypeahead$ = new Subject<string>();
  readonly itemTypeahead$ = new Subject<string>();
  readonly paymentMethods = PAYMENT_METHODS;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  customerOptions: CustomerResponse[] = [];
  itemOptions: ItemResponse[] = [];
  cartItems: SalesCartItem[] = [];

  loadingStores = false;
  loadingCustomers = false;
  loadingItems = false;
  submitted = false;
  loading = false;
  loadingRecord = true;
  salesId = '';
  invoiceNcId = '';
  statusLabel = '';

  private loadedRecord: SalesResponse | null = null;
  private readonly destroy$ = new Subject<void>();
  private applyingGrossDiscount = false;
  private previousStoreId: string | null = null;
  private hydrating = false;
  private cartDirty = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly salesApi: SalesApiService,
    private readonly storeApi: StoreApiService,
    private readonly customerApi: CustomerApiService,
    private readonly itemApi: ItemApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.salesForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      customerId: [null as string | null],
      salesDate: [null as Date | null, Validators.required],
      paymentMethod: ['CASH' as PaymentMethod, Validators.required],
      grossDiscountAmount: [null as number | null],
      grossDiscountPercent: [null as number | null],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
    });
    this.pickerForm = this.formBuilder.group({
      itemId: [null as string | null],
      purchaseRate: [{ value: null as number | null, disabled: true }],
      salesRate: [{ value: null as number | null, disabled: true }],
      currentStock: [{ value: null as number | null, disabled: true }],
      quantity: [null as number | null],
      discountAmount: [null as number | null],
    });
  }

  get f() {
    return this.salesForm.controls;
  }

  get canEdit(): boolean {
    return isSalesEditable(this.loadedRecord?.salesStatus);
  }

  get totals() {
    return salesCartTotals(this.cartItems);
  }

  get dueAmount(): number {
    return roundMoney(Math.max(0, this.totals.grandTotal - toNumber(this.f['paidAmount'].value)));
  }

  ngOnInit(): void {
    this.salesId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.salesId) {
      this.toastr.error('Sale id is missing');
      void this.router.navigate(['/sales/list']);
      return;
    }

    this.setupCustomerTypeahead();
    this.setupItemTypeahead();
    this.salesForm
      .get('storeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((storeId) => this.onStoreChange(storeId));
    this.loadStores();
    this.loadSales();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  customerLabel(customer: CustomerResponse): string {
    const name = customer.customerName || customer.id || '';
    return customer.mobile ? `${name} (${customer.mobile})` : name;
  }

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  paymentLabel(method: PaymentMethod): string {
    return paymentMethodLabel(method);
  }

  itemStock(item: ItemResponse): number {
    return toNumber(item.currentStock);
  }

  lineTotal(item: SalesCartItem): number {
    return salesLineTotal(item);
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
  }

  addPickerItem(): void {
    if (!this.canEdit) {
      return;
    }
    const storeId = this.salesForm.get('storeId')?.value;
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
    const liveStock = toNumber(item.currentStock);
    const originalQty = this.originalQuantity(itemId);
    const availableStock = roundMoney(liveStock + originalQty);
    const alreadyInCart = existing?.quantity ?? 0;
    const remaining = roundMoney(availableStock - alreadyInCart);
    if (quantity > remaining) {
      this.toastr.error(
        remaining <= 0
          ? 'This item is already at available stock in the cart'
          : `Only ${remaining} remaining in stock`,
      );
      return;
    }

    const unitPrice = toNumber(item.salesRate);
    const pickerDiscount = Math.max(0, toNumber(this.pickerForm.get('discountAmount')?.value));
    this.cartDirty = true;
    if (existing) {
      existing.quantity = roundMoney(existing.quantity + quantity);
      existing.currentStock = liveStock;
      existing.availableStock = availableStock;
      existing.unitPrice = unitPrice;
      existing.purchaseRate = toNumber(item.purchaseRate);
      existing.salesRate = unitPrice;
      if (pickerDiscount > 0) {
        existing.discountAmount = roundMoney(
          Math.min(salesLineGross(existing), existing.discountAmount + pickerDiscount),
        );
      }
      this.cartItems = [...this.cartItems];
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          itemId,
          itemName: item.itemName || itemId,
          itemCode: item.itemCode,
          quantity,
          unitPrice,
          purchaseRate: toNumber(item.purchaseRate),
          salesRate: unitPrice,
          currentStock: liveStock,
          availableStock,
          discountAmount: Math.min(pickerDiscount, salesLineGross({ quantity, unitPrice })),
        },
      ];
    }

    this.resetPicker(false);
    this.reapplyGrossDiscountIfNeeded();
    this.syncPaidAmount();
  }

  removeCartItem(index: number): void {
    if (!this.canEdit) {
      return;
    }
    this.cartDirty = true;
    this.cartItems = this.cartItems.filter((_, itemIndex) => itemIndex !== index);
    this.reapplyGrossDiscountIfNeeded();
    this.syncPaidAmount();
  }

  onCartQtyChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item || !this.canEdit) {
      return;
    }
    this.cartDirty = true;
    const quantity = Math.max(0, toNumber(value));
    item.quantity = Math.min(quantity, item.availableStock);
    item.discountAmount = Math.min(item.discountAmount, salesLineGross(item));
    this.reapplyGrossDiscountIfNeeded();
    this.syncPaidAmount();
  }

  onCartDiscountChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item || !this.canEdit) {
      return;
    }
    this.cartDirty = true;
    item.discountAmount = roundMoney(Math.min(Math.max(0, toNumber(value)), salesLineGross(item)));
    this.clearGrossDiscountFields();
    this.syncPaidAmount();
  }

  onGrossAmountChange(): void {
    if (this.applyingGrossDiscount || !this.canEdit) {
      return;
    }
    this.cartDirty = true;
    const amount = toNumber(this.salesForm.get('grossDiscountAmount')?.value);
    const subTotal = this.totals.subTotal;
    this.applyingGrossDiscount = true;
    this.salesForm.patchValue(
      {
        grossDiscountAmount: amount || null,
        grossDiscountPercent: subTotal > 0 ? roundMoney((amount / subTotal) * 100) : null,
      },
      { emitEvent: false },
    );
    this.cartItems = distributeSalesDiscount(this.cartItems, amount);
    this.applyingGrossDiscount = false;
    this.syncPaidAmount();
  }

  onGrossPercentChange(): void {
    if (this.applyingGrossDiscount || !this.canEdit) {
      return;
    }
    this.cartDirty = true;
    const percent = Math.max(0, toNumber(this.salesForm.get('grossDiscountPercent')?.value));
    const amount = roundMoney((this.totals.subTotal * percent) / 100);
    this.applyingGrossDiscount = true;
    this.salesForm.patchValue(
      {
        grossDiscountPercent: percent || null,
        grossDiscountAmount: amount || null,
      },
      { emitEvent: false },
    );
    this.cartItems = distributeSalesDiscount(this.cartItems, amount);
    this.applyingGrossDiscount = false;
    this.syncPaidAmount();
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.canEdit) {
      return;
    }
    if (this.salesForm.invalid) {
      this.salesForm.markAllAsTouched();
      return;
    }
    if (!this.cartItems.length) {
      this.toastr.error('Add at least one item');
      return;
    }
    if (this.cartItems.some((item) => item.quantity <= 0)) {
      this.toastr.error('Each cart item needs a quantity');
      return;
    }

    this.loading = true;
    this.salesApi
      .updateSales(this.salesId, this.buildDto())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Sale updated successfully');
          void this.router.navigate(['/sales/list']);
        },
      });
  }

  onClear(): void {
    if (!this.canEdit || !this.loadedRecord) {
      return;
    }
    this.applyRecord(this.loadedRecord);
  }

  private buildDto(): SalesDto {
    const value = this.salesForm.getRawValue();
    const totals = this.totals;
    const paidAmount = toNumber(value.paidAmount);
    const items = this.cartItems.map(
      (item) =>
        new SalesItemDto({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: 0,
        }),
    );

    return new SalesDto({
      salesDate: toApiDate(value.salesDate),
      storeId: value.storeId,
      customerId: value.customerId || undefined,
      subTotal: totals.subTotal,
      discountAmount: totals.discountAmount,
      taxAmount: 0,
      totalAmount: totals.grandTotal,
      paidAmount,
      dueAmount: roundMoney(Math.max(0, totals.grandTotal - paidAmount)),
      paymentMethod: value.paymentMethod,
      items,
    });
  }

  private loadSales(): void {
    this.loadingRecord = true;
    this.salesApi
      .getSalesById(this.salesId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loadingRecord = false)),
      )
      .subscribe({
        next: (sale) => this.applyRecord(sale),
        error: () => void this.router.navigate(['/sales/list']),
      });
  }

  private applyRecord(sale: SalesResponse): void {
    this.hydrating = true;
    this.cartDirty = false;
    this.loadedRecord = sale;
    this.invoiceNcId = sale.invoiceNcId || '';
    this.statusLabel = salesStatusLabel(sale.salesStatus);
    this.salesForm.patchValue({
      storeId: sale.storeId || null,
      customerId: sale.customerId || null,
      salesDate: toDatePickerValue(sale.salesDate),
      paymentMethod: sale.paymentMethod || 'CASH',
      grossDiscountAmount: null,
      grossDiscountPercent: null,
      paidAmount: toNumber(sale.paidAmount ?? sale.totalAmount),
    });
    this.previousStoreId = sale.storeId || null;
    this.resetPicker(true);
    if (sale.customerId) {
      this.ensureCustomerOption(sale.customerId, sale.customerName, sale.customerMobile);
    }
    this.hydrateCart(sale);
    if (!this.canEdit) {
      this.salesForm.disable({ emitEvent: false });
      this.pickerForm.disable({ emitEvent: false });
    } else {
      this.salesForm.enable({ emitEvent: false });
      this.pickerForm.enable({ emitEvent: false });
      this.pickerForm.get('purchaseRate')?.disable({ emitEvent: false });
      this.pickerForm.get('salesRate')?.disable({ emitEvent: false });
      this.pickerForm.get('currentStock')?.disable({ emitEvent: false });
    }
    this.hydrating = false;
  }

  private hydrateCart(sale: SalesResponse): void {
    const lines = sale.items ?? [];
    if (!lines.length) {
      this.cartItems = [];
      return;
    }

    forkJoin(lines.map((line) => this.loadItemStock(line, sale.storeId)))
      .pipe(takeUntil(this.destroy$))
      .subscribe((stockItems) => {
      this.cartItems = lines.map((line, index) => {
        const stockItem = stockItems[index];
        const quantity = toNumber(line.quantity);
        const currentStock = toNumber(stockItem?.currentStock);
        return {
          itemId: line.itemId || '',
          itemName: line.itemName || stockItem?.itemName || line.itemId || '',
          itemCode: stockItem?.itemCode,
          quantity,
          unitPrice: toNumber(line.unitPrice),
          purchaseRate: toNumber(stockItem?.purchaseRate),
          salesRate: toNumber(stockItem?.salesRate ?? line.unitPrice),
          currentStock,
          availableStock: roundMoney(currentStock + quantity),
          discountAmount: toNumber(line.discountAmount),
        };
      });
    });
  }

  private loadItemStock(line: SalesItemResponse, storeId?: string) {
    if (!line.itemId) {
      return of(undefined);
    }
    return this.itemApi
      .searchTermWithStock(
        new ItemSearchDto({
          id: line.itemId,
          storeId,
        }),
      )
      .pipe(
        map((items) => items?.[0]),
        catchError(() => of(undefined)),
      );
  }

  private originalQuantity(itemId: string): number {
    return toNumber(
      this.loadedRecord?.items?.find((line) => line.itemId === itemId)?.quantity,
    );
  }

  private ensureCustomerOption(
    customerId: string,
    customerName?: string,
    customerMobile?: string,
  ): void {
    if (this.customerOptions.some((option) => option.id === customerId)) {
      return;
    }
    if (customerName) {
      this.customerOptions = [
        ...this.customerOptions,
        { id: customerId, customerName, mobile: customerMobile },
      ];
      return;
    }
    this.customerApi.getCustomerById(customerId).subscribe({
      next: (customer) => {
        if (customer?.id) {
          this.customerOptions = this.mergeOptions(this.customerOptions, [customer]);
        }
      },
    });
  }

  private onStoreChange(storeId: string | null): void {
    if (this.hydrating || storeId === this.previousStoreId) {
      return;
    }
    const hadCart = this.cartItems.length > 0;
    this.cartDirty = true;
    this.cartItems = [];
    this.resetPicker(true);
    this.clearGrossDiscountFields();
    this.syncPaidAmount();
    this.previousStoreId = storeId;
    if (hadCart) {
      this.toastr.info('Cart cleared because the store changed');
    }
  }

  private resetPicker(clearOptions: boolean): void {
    this.pickerForm.patchValue({
      itemId: null,
      purchaseRate: null,
      salesRate: null,
      currentStock: null,
      quantity: null,
      discountAmount: null,
    });
    if (clearOptions) {
      this.itemOptions = [];
    }
  }

  private reapplyGrossDiscountIfNeeded(): void {
    const amount = toNumber(this.salesForm.get('grossDiscountAmount')?.value);
    const percent = toNumber(this.salesForm.get('grossDiscountPercent')?.value);
    if (amount <= 0 && percent <= 0) {
      return;
    }
    if (percent > 0 && amount <= 0) {
      this.onGrossPercentChange();
      return;
    }
    this.onGrossAmountChange();
  }

  private clearGrossDiscountFields(): void {
    this.applyingGrossDiscount = true;
    this.salesForm.patchValue(
      {
        grossDiscountAmount: null,
        grossDiscountPercent: null,
      },
      { emitEvent: false },
    );
    this.applyingGrossDiscount = false;
  }

  private syncPaidAmount(): void {
    if (!this.cartDirty && this.loadedRecord) {
      this.salesForm.patchValue(
        { paidAmount: toNumber(this.loadedRecord.paidAmount ?? this.loadedRecord.totalAmount) },
        { emitEvent: false },
      );
      return;
    }
    this.salesForm.patchValue({ paidAmount: this.totals.grandTotal }, { emitEvent: false });
  }

  private setupCustomerTypeahead(): void {
    this.customerTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchCustomers(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((customers) => {
        this.customerOptions = this.mergeOptions(this.selectedCustomerOptions(), customers);
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
      });
  }

  private searchCustomers(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.selectedCustomerOptions());
    }

    this.loadingCustomers = true;
    return this.customerApi
      .searchTerm(
        new CustomerSearchDto({
          searchTerm,
          enabled: true,
        }),
      )
      .pipe(
        map((customers) => customers ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingCustomers = false)),
      );
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    const storeId = this.salesForm.get('storeId')?.value as string | null;
    if (!storeId || !searchTerm || searchTerm.length < 2) {
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

  private selectedCustomerOptions(): CustomerResponse[] {
    const selectedId = this.salesForm.get('customerId')?.value as string | null;
    return this.customerOptions.filter(
      (customer) => customer.id && customer.id === selectedId,
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
}
