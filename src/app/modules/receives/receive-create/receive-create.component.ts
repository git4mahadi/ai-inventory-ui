import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { ReceiveDto } from '../../../models/dto/ReceiveDto';
import { ReceiveItemDto } from '../../../models/dto/ReceiveItemDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { PurchaseOrderItemResponse } from '../../../models/response/PurchaseOrderItemResponse';
import { PurchaseOrderResponse } from '../../../models/response/PurchaseOrderResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { PurchaseOrderSearchDto } from '../../../models/search/PurchaseOrderSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { PurchaseOrderApiService } from '../../../services/PurchaseOrderApiService';
import { ReceiveApiService } from '../../../services/ReceiveApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';

@Component({
  selector: 'app-receive-create',
  standalone: false,
  templateUrl: './receive-create.component.html',
  styleUrl: './receive-create.component.scss',
})
export class ReceiveCreateComponent implements OnInit, OnDestroy {
  readonly receiveForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();
  readonly purchaseOrderTypeahead$ = new Subject<string>();
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  purchaseOrderOptions: PurchaseOrderResponse[] = [];
  itemOptions: ItemResponse[] = [];
  packSizeOptions: LookupResponse[] = [];

  loadingStores = false;
  loadingItems = false;
  loadingPurchaseOrders = false;
  loadingLookups = false;

  submitted = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();
  private applyingPurchaseOrder = false;
  private purchaseOrderRequestVersion = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly receiveApi: ReceiveApiService,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly itemApi: ItemApiService,
    private readonly lookupApi: LookupApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.receiveForm = this.formBuilder.group({
      purchaseOrderId: [null as string | null, Validators.required],
      storeId: [{ value: null as string | null, disabled: true }, Validators.required],
      supplierId: [{ value: null as string | null, disabled: true }, Validators.required],
      receiveDate: [new Date(), Validators.required],
      items: this.formBuilder.array([this.createItemGroup()]),
    });
  }

  get f() {
    return this.receiveForm.controls;
  }

  get itemRows(): FormArray {
    return this.receiveForm.get('items') as FormArray;
  }

  get itemsTotal(): number {
    return this.itemRows.controls.reduce(
      (sum, row) => sum + this.lineTotalFor(row.value),
      0,
    );
  }

  ngOnInit(): void {
    this.loadStores();
    this.loadPackSizes();
    this.setupItemTypeahead();
    this.setupPurchaseOrderTypeahead();
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

  purchaseOrderLabel(order: PurchaseOrderResponse): string {
    return order.orderNcId || order.id || '';
  }

  itemLabel(item: ItemResponse): string {
    const name = item.itemName || item.id || '';
    return item.itemCode ? `${name} (${item.itemCode})` : name;
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  itemRow(index: number): FormGroup {
    return this.itemRows.at(index) as FormGroup;
  }

  lineTotalAt(index: number): number {
    return this.lineTotalFor(this.itemRow(index).value);
  }

  addItemRow(): void {
    this.itemRows.push(this.createItemGroup());
  }

  removeItemRow(index: number): void {
    if (this.itemRows.length <= 1) {
      return;
    }
    this.itemRows.removeAt(index);
  }

  onPurchaseOrderChange(selected: string | PurchaseOrderResponse | null): void {
    const requestVersion = ++this.purchaseOrderRequestVersion;
    const purchaseOrderId =
      typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!purchaseOrderId) {
      this.applyingPurchaseOrder = false;
      this.receiveForm.patchValue({ storeId: null, supplierId: null });
      this.replaceItemRows([]);
      return;
    }

    // Clear the previous order's lines immediately. This also prevents stale
    // rows from remaining visible while the newly selected order is loading.
    this.replaceItemRows([]);
    this.applyingPurchaseOrder = true;
    this.purchaseOrderApi
      .getPurchaseOrderById(purchaseOrderId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (requestVersion === this.purchaseOrderRequestVersion) {
            this.applyingPurchaseOrder = false;
          }
        }),
      )
      .subscribe({
        next: (order) => {
          if (
            requestVersion !== this.purchaseOrderRequestVersion ||
            this.receiveForm.get('purchaseOrderId')?.value !== purchaseOrderId
          ) {
            return;
          }
          this.applyPurchaseOrder(order);
        },
      });
  }

  onItemChange(index: number, selected: string | ItemResponse | null): void {
    if (this.applyingPurchaseOrder) {
      return;
    }
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!itemId) {
      this.itemRow(index).patchValue({ itemName: '', unitPrice: null, uom: null });
      return;
    }

    const row = this.itemRow(index);
    this.itemApi
      .getItemById(itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (item) => {
          // The row may have been removed or replaced while the lookup was pending.
          if (this.itemRows.at(index) !== row) {
            return;
          }
          this.itemOptions = this.mergeOptions(this.itemOptions, [item]);
          row.patchValue({
            itemName: item.itemName || '',
            unitPrice: item.purchaseRate ?? row.get('unitPrice')?.value,
            uom: item.packSizeId || row.get('uom')?.value,
            batchNo: row.get('batchNo')?.value || this.nextBatchNo(),
          });
          this.ensurePackSizeOption(item.packSizeId, item.packSizeName);
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.receiveForm.invalid || this.loading) {
      this.receiveForm.markAllAsTouched();
      return;
    }

    if (this.hasDuplicateItemBatch()) {
      this.toastr.error('Duplicate item and batch combination found in items');
      return;
    }

    const raw = this.receiveForm.getRawValue();
    if (!raw.storeId || !raw.supplierId) {
      this.toastr.error('Store and supplier must come from the purchase order');
      return;
    }

    const dto = this.buildDto();
    this.loading = true;
    this.receiveApi
      .createReceive(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Receive created successfully');
          void this.router.navigate(['/receives/list']);
        },
      });
  }

  onClear(): void {
    ++this.purchaseOrderRequestVersion;
    this.applyingPurchaseOrder = false;
    this.receiveForm.reset({
      purchaseOrderId: null,
      storeId: null,
      supplierId: null,
      receiveDate: new Date(),
    });
    this.replaceItemRows([]);
    this.itemOptions = [];
    this.purchaseOrderOptions = [];
    this.submitted = false;
  }

  private buildDto(): ReceiveDto {
    const value = this.receiveForm.getRawValue();
    return new ReceiveDto({
      receiveDate: toApiDate(value.receiveDate),
      purchaseOrderId: value.purchaseOrderId,
      storeId: value.storeId,
      supplierId: value.supplierId,
      items: this.itemRows.controls.map((row) => {
        const rowValue = row.getRawValue();
        const receivedQty = Number(rowValue.receivedQty);
        const unitPrice = Number(rowValue.unitPrice);
        return new ReceiveItemDto({
          itemId: rowValue.itemId,
          receivedQty,
          rejectedQty: Number(rowValue.rejectedQty || 0),
          unitPrice,
          lineTotal: receivedQty * unitPrice,
          uom: this.resolveUomName(rowValue.uom),
          batchNo: rowValue.batchNo?.trim(),
          expireDate: toApiDate(rowValue.expireDate),
          remarks: rowValue.remarks?.trim() || undefined,
        });
      }),
    });
  }

  private applyPurchaseOrder(order: PurchaseOrderResponse): void {
    this.purchaseOrderOptions = this.mergeOptions(this.purchaseOrderOptions, [order]);
    this.receiveForm.patchValue({
      storeId: order.storeId ?? null,
      supplierId: order.supplierId ?? null,
    });
    this.ensureSelectedStore(order.storeId);
    this.ensureSelectedSupplier(order.supplierId);

    const poItems = order.items?.filter((item) => !!item.itemId) ?? [];
    this.replaceItemRows(poItems);
  }

  private replaceItemRows(items: PurchaseOrderItemResponse[]): void {
    this.itemRows.clear();
    this.itemOptions = [];
    if (!items.length) {
      this.itemRows.push(this.createItemGroup());
      return;
    }

    for (const item of items) {
      this.itemRows.push(this.createItemGroup(item));
      if (item.itemId) {
        this.itemOptions = this.mergeOptions(this.itemOptions, [
          { id: item.itemId, itemName: item.itemName },
        ]);
      }
    }
  }

  private createItemGroup(item?: PurchaseOrderItemResponse): FormGroup {
    return this.formBuilder.group({
      itemId: [item?.itemId ?? null, Validators.required],
      itemName: [item?.itemName ?? ''],
      receivedQty: [
        item?.orderedQty ?? null,
        [Validators.required, Validators.min(0.01)],
      ],
      rejectedQty: [null, [Validators.min(0)]],
      unitPrice: [item?.unitPrice ?? null, [Validators.required, Validators.min(0)]],
      uom: [null as string | null],
      batchNo: [
        this.nextBatchNo(),
        [Validators.required, Validators.maxLength(30)],
      ],
      expireDate: [null as Date | null],
      remarks: ['', [Validators.maxLength(255)]],
    });
  }

  private nextBatchNo(): string {
    return generateBatchNo(this.selectedStoreCode());
  }

  private selectedStoreCode(): string | null {
    const storeId = this.receiveForm?.getRawValue()?.storeId as string | null;
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
        this.itemOptions = this.mergeOptions(this.selectedItemOptions(), items);
      });
  }

  private setupPurchaseOrderTypeahead(): void {
    this.purchaseOrderTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchPurchaseOrders(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((orders) => {
        this.purchaseOrderOptions = this.mergeOptions(
          this.selectedPurchaseOrderOptions(),
          orders,
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
          storeId: this.receiveForm.getRawValue().storeId || undefined,
          enabled: true,
        }),
      )
      .pipe(
        map((items) => items ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingItems = false)),
      );
  }

  private searchPurchaseOrders(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 2) {
      return of(this.selectedPurchaseOrderOptions());
    }

    this.loadingPurchaseOrders = true;
    return this.purchaseOrderApi
      .searchTerm(
        new PurchaseOrderSearchDto({
          searchTerm,
          enabled: true,
        }),
      )
      .pipe(
        map((orders) => orders ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingPurchaseOrders = false)),
      );
  }

  private selectedItemOptions(): ItemResponse[] {
    const selectedIds = this.itemRows.controls
      .map((row) => row.get('itemId')?.value as string | null)
      .filter((id): id is string => !!id);
    return this.itemOptions.filter((item) => item.id && selectedIds.includes(item.id));
  }

  private selectedPurchaseOrderOptions(): PurchaseOrderResponse[] {
    const selectedId = this.receiveForm.get('purchaseOrderId')?.value as string | null;
    return this.purchaseOrderOptions.filter(
      (order) => order.id && order.id === selectedId,
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

  private ensureSelectedStore(storeId?: string): void {
    if (!storeId || this.storeOptions.some((store) => store.id === storeId)) {
      return;
    }
    this.storeApi.getStoreById(storeId).subscribe({
      next: (store) => {
        if (store?.id) {
          this.storeOptions = this.mergeOptions(this.storeOptions, [store]);
        }
      },
    });
  }

  private ensureSelectedSupplier(supplierId?: string): void {
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

  private hasDuplicateItemBatch(): boolean {
    const keys = new Set<string>();
    for (const row of this.itemRows.controls) {
      const itemId = row.get('itemId')?.value as string | null;
      const batchNo = String(row.get('batchNo')?.value || '').trim();
      if (!itemId || !batchNo) {
        continue;
      }
      const key = `${itemId}|${batchNo}`;
      if (keys.has(key)) {
        return true;
      }
      keys.add(key);
    }
    return false;
  }

  private lineTotalFor(row: {
    receivedQty?: number | string | null;
    unitPrice?: number | string | null;
  }): number {
    const qty = Number(row.receivedQty || 0);
    const price = Number(row.unitPrice || 0);
    return qty * price;
  }
}
