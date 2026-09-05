import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import {
  calculatePurchaseOrderGrandTotal,
  calculatePurchaseOrderLineTotal,
} from '../../../core/utils/purchase-order-total.util';
import { PurchaseOrderDto } from '../../../models/dto/PurchaseOrderDto';
import { PurchaseOrderItemDto } from '../../../models/dto/PurchaseOrderItemDto';
import {
  isPurchaseOrderEditable,
  purchaseOrderStatusLabel,
} from '../../../models/enums/PurchaseOrderStatus';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { PurchaseOrderItemResponse } from '../../../models/response/PurchaseOrderItemResponse';
import { PurchaseOrderResponse } from '../../../models/response/PurchaseOrderResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { PurchaseOrderApiService } from '../../../services/PurchaseOrderApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-purchase-order-edit',
  standalone: false,
  templateUrl: './purchase-order-edit.component.html',
  styleUrl: './purchase-order-edit.component.scss',
})
export class PurchaseOrderEditComponent implements OnInit, OnDestroy {
  readonly purchaseOrderForm: FormGroup;
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

  loadingStores = false;
  loadingItems = false;
  loadingSuppliers = false;

  submitted = false;
  loading = false;
  loadingRecord = true;
  purchaseOrderId = '';
  orderNcId = '';
  statusLabel = '';

  private loadedRecord: PurchaseOrderResponse | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly storeApi: StoreApiService,
    private readonly itemApi: ItemApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.purchaseOrderForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      supplierId: [null as string | null, Validators.required],
      orderDate: [null as Date | null, Validators.required],
      expectedDate: [null as Date | null],
      discountAmount: [null],
      taxAmount: [null],
      shippingCharge: [null],
      otherCharge: [null],
      remarks: ['', [Validators.maxLength(255)]],
      items: this.formBuilder.array([this.createItemGroup()]),
    });
  }

  get f() {
    return this.purchaseOrderForm.controls;
  }

  get itemRows(): FormArray {
    return this.purchaseOrderForm.get('items') as FormArray;
  }

  get canEdit(): boolean {
    return isPurchaseOrderEditable(this.loadedRecord?.orderStatus);
  }

  get subTotal(): number {
    return this.itemRows.controls.reduce(
      (sum, row) => sum + calculatePurchaseOrderLineTotal(row.value),
      0,
    );
  }

  get grandTotal(): number {
    const value = this.purchaseOrderForm.getRawValue();
    return calculatePurchaseOrderGrandTotal({
      subTotal: this.subTotal,
      discountAmount: value.discountAmount,
      taxAmount: value.taxAmount,
      shippingCharge: value.shippingCharge,
      otherCharge: value.otherCharge,
    });
  }

  ngOnInit(): void {
    this.purchaseOrderId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.purchaseOrderId) {
      this.toastr.error('Purchase order id is missing');
      void this.router.navigate(['/purchase-orders/list']);
      return;
    }

    this.setupItemTypeahead();
    this.setupSupplierTypeahead();
    this.purchaseOrderForm
      .get('storeId')
      ?.valueChanges.pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.onStoreChange());
    this.loadStores();
    this.loadPurchaseOrder();
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

  itemRow(index: number): FormGroup {
    return this.itemRows.at(index) as FormGroup;
  }

  lineTotalAt(index: number): number {
    return calculatePurchaseOrderLineTotal(this.itemRow(index).value);
  }

  addItemRow(): void {
    if (!this.canEdit) {
      return;
    }
    this.itemRows.push(this.createItemGroup());
  }

  removeItemRow(index: number): void {
    if (!this.canEdit || this.itemRows.length <= 1) {
      return;
    }
    this.itemRows.removeAt(index);
  }

  onItemChange(index: number, selected: string | ItemResponse | null): void {
    if (this.loadingRecord || !this.canEdit) {
      return;
    }
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!itemId) {
      this.itemRow(index).patchValue({ itemName: '', unitPrice: null });
      return;
    }

    this.itemApi
      .getItemById(itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (item) => {
          this.itemOptions = this.mergeOptions(this.itemOptions, [item]);
          this.itemRow(index).patchValue({
            itemName: item.itemName || '',
            unitPrice: item.purchaseRate ?? null,
          });
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.canEdit) {
      this.toastr.error('Only submitted purchase orders can be updated');
      return;
    }
    if (this.purchaseOrderForm.invalid || this.loading || !this.purchaseOrderId) {
      this.purchaseOrderForm.markAllAsTouched();
      if (!this.purchaseOrderForm.get('supplierId')?.value) {
        this.toastr.error('Select Supplier !!!');
      }
      return;
    }

    const dto = this.buildDto();
    this.loading = true;
    this.purchaseOrderApi
      .updatePurchaseOrder(this.purchaseOrderId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Purchase order updated successfully');
          void this.router.navigate(['/purchase-orders/list']);
        },
      });
  }

  onClear(): void {
    if (this.loadedRecord) {
      this.patchForm(this.loadedRecord);
      this.submitted = false;
    }
  }

  private loadPurchaseOrder(): void {
    this.loadingRecord = true;
    this.purchaseOrderApi
      .getPurchaseOrderById(this.purchaseOrderId)
      .pipe(finalize(() => (this.loadingRecord = false)))
      .subscribe({
        next: (record) => {
          this.patchForm(record);
        },
        error: () => {
          void this.router.navigate(['/purchase-orders/list']);
        },
      });
  }

  private patchForm(record: PurchaseOrderResponse): void {
    this.loadedRecord = record;
    this.orderNcId = record.orderNcId || '';
    this.statusLabel = purchaseOrderStatusLabel(record.orderStatus);

    this.purchaseOrderForm.patchValue(
      {
        storeId: record.storeId ?? null,
        supplierId: record.supplierId ?? null,
        orderDate: toDatePickerValue(record.orderDate),
        expectedDate: toDatePickerValue(record.expectedDate),
        discountAmount: record.discountAmount ?? null,
        taxAmount: record.taxAmount ?? null,
        shippingCharge: record.shippingCharge ?? null,
        otherCharge: record.otherCharge ?? null,
        remarks: record.remarks ?? '',
      },
      { emitEvent: false },
    );

    this.itemRows.clear();
    const items = record.items?.length ? record.items : [undefined];
    for (const item of items) {
      this.itemRows.push(this.createItemGroup(item));
      if (item?.itemId) {
        this.itemOptions = this.mergeOptions(this.itemOptions, [
          { id: item.itemId, itemName: item.itemName },
        ]);
      }
    }

    this.ensureSelectedSupplier();
    this.ensureSelectedStore();
    this.syncFormEnabledState();
  }

  private createItemGroup(item?: PurchaseOrderItemResponse): FormGroup {
    return this.formBuilder.group({
      itemId: [item?.itemId ?? null, Validators.required],
      itemName: [item?.itemName ?? ''],
      orderedQty: [item?.orderedQty ?? null, [Validators.required, Validators.min(0.01)]],
      receivedQty: [item?.receivedQty ?? 0],
      unitPrice: [item?.unitPrice ?? null, [Validators.required, Validators.min(0)]],
      discountPercent: [item?.discountPercent ?? null, [Validators.min(0)]],
      discountAmount: [item?.discountAmount ?? null, [Validators.min(0)]],
      taxPercent: [item?.taxPercent ?? null, [Validators.min(0)]],
      taxAmount: [item?.taxAmount ?? null, [Validators.min(0)]],
      remarks: [item?.remarks ?? '', [Validators.maxLength(120)]],
    });
  }

  private buildDto(): PurchaseOrderDto {
    const value = this.purchaseOrderForm.getRawValue();
    const items = this.itemRows.controls.map((row) => {
      const rowValue = row.getRawValue();
      return new PurchaseOrderItemDto({
        itemId: rowValue.itemId,
        orderedQty: Number(rowValue.orderedQty),
        receivedQty: Number(rowValue.receivedQty || 0),
        unitPrice: Number(rowValue.unitPrice),
        discountPercent: Number(rowValue.discountPercent || 0),
        discountAmount: Number(rowValue.discountAmount || 0),
        taxPercent: Number(rowValue.taxPercent || 0),
        taxAmount: Number(rowValue.taxAmount || 0),
        remarks: rowValue.remarks?.trim() || undefined,
      });
    });

    return new PurchaseOrderDto({
      orderDate: toApiDate(value.orderDate),
      expectedDate: toApiDate(value.expectedDate),
      storeId: value.storeId,
      supplierId: value.supplierId,
      subTotal: this.subTotal,
      discountAmount: Number(value.discountAmount || 0),
      taxAmount: Number(value.taxAmount || 0),
      shippingCharge: Number(value.shippingCharge || 0),
      otherCharge: Number(value.otherCharge || 0),
      grandTotal: this.grandTotal,
      remarks: value.remarks?.trim() || undefined,
      items,
    });
  }

  private onStoreChange(): void {
    if (this.loadingRecord || !this.canEdit) {
      return;
    }
    const hasSelectedItems = this.itemRows.controls.some(
      (row) => !!row.get('itemId')?.value,
    );
    if (!hasSelectedItems) {
      return;
    }

    for (const row of this.itemRows.controls) {
      row.patchValue({ itemId: null, itemName: '', unitPrice: null, receivedQty: 0 });
    }
    this.itemOptions = [];
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
        this.itemOptions = this.mergeOptions(this.selectedItemOptions(), items);
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
        this.supplierOptions = this.mergeOptions(
          this.selectedSupplierOptions(),
          suppliers,
        );
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
        this.ensureSelectedStore();
      });
  }

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 2) {
      return of(this.selectedItemOptions());
    }

    this.loadingItems = true;
    return this.itemApi
      .searchTerm(
        new ItemSearchDto({
          searchTerm,
          storeId: this.purchaseOrderForm.get('storeId')?.value || undefined,
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

  private selectedItemOptions(): ItemResponse[] {
    const selectedIds = this.itemRows.controls
      .map((row) => row.get('itemId')?.value as string | null)
      .filter((id): id is string => !!id);
    return this.itemOptions.filter((item) => item.id && selectedIds.includes(item.id));
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

  private ensureSelectedStore(): void {
    const storeId = this.purchaseOrderForm.get('storeId')?.value as string | null;
    if (storeId && !this.storeOptions.some((store) => store.id === storeId)) {
      this.storeApi.getStoreById(storeId).subscribe({
        next: (store) => {
          if (store?.id) {
            this.storeOptions = this.mergeOptions(this.storeOptions, [store]);
          }
        },
      });
    }
  }

  private ensureSelectedSupplier(): void {
    const supplierId = this.purchaseOrderForm.get('supplierId')?.value as string | null;
    if (!supplierId || this.supplierOptions.some((supplier) => supplier.id === supplierId)) {
      return;
    }
    this.supplierApi.getSupplierById(supplierId).subscribe({
      next: (supplier) => {
        if (supplier?.id) {
          this.supplierOptions = this.mergeOptions(this.supplierOptions, [supplier]);
        }
      },
    });
  }

  private syncFormEnabledState(): void {
    if (this.canEdit) {
      this.purchaseOrderForm.enable({ emitEvent: false });
      return;
    }
    this.purchaseOrderForm.disable({ emitEvent: false });
  }
}
