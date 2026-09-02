import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
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
import { generateBatchNo } from '../../../core/utils/batch-no.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { ReceiveDto } from '../../../models/dto/ReceiveDto';
import { ReceiveItemDto } from '../../../models/dto/ReceiveItemDto';
import {
  isItemReceiveEditable,
  itemReceiveStatusLabel,
} from '../../../models/enums/ItemReceiveStatus';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { PurchaseOrderItemResponse } from '../../../models/response/PurchaseOrderItemResponse';
import { PurchaseOrderResponse } from '../../../models/response/PurchaseOrderResponse';
import { ReceiveItemResponse } from '../../../models/response/ReceiveItemResponse';
import { ReceiveResponse } from '../../../models/response/ReceiveResponse';
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
  selector: 'app-receive-edit',
  standalone: false,
  templateUrl: './receive-edit.component.html',
  styleUrl: './receive-edit.component.scss',
})
export class ReceiveEditComponent implements OnInit, OnDestroy {
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
  readonly expireDatePickerConfig: Partial<BsDatepickerConfig> = {
    ...this.datePickerConfig,
    startView: 'year',
  };

  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  purchaseOrderOptions: PurchaseOrderResponse[] = [];
  purchaseOrderItems: PurchaseOrderItemResponse[] = [];
  itemOptions: ItemResponse[] = [];
  packSizeOptions: LookupResponse[] = [];

  loadingStores = false;
  loadingItems = false;
  loadingPurchaseOrders = false;
  loadingLookups = false;

  submitted = false;
  loading = false;
  loadingRecord = true;
  receiveId = '';
  receiveNcId = '';
  statusLabel = '';

  private loadedRecord: ReceiveResponse | null = null;
  private readonly destroy$ = new Subject<void>();
  private applyingPurchaseOrder = false;
  private purchaseOrderRequestVersion = 0;
  private readonly receivedQtyAgainstPoValidator: ValidatorFn = (control) => {
    if (!(control instanceof FormArray) || !this.purchaseOrderItems.length) {
      return null;
    }

    const receivedByItem = new Map<string, number>();
    for (const row of control.controls) {
      const itemId = row.get('itemId')?.value as string | null;
      if (!itemId) {
        continue;
      }
      receivedByItem.set(
        itemId,
        (receivedByItem.get(itemId) || 0) + Number(row.get('receivedQty')?.value || 0),
      );
    }

    for (const [itemId, received] of receivedByItem) {
      const ordered = this.orderedQtyForItem(itemId);
      if (ordered == null || received > ordered) {
        return { receivedQtyExceedsPo: true };
      }
    }
    return null;
  };

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly receiveApi: ReceiveApiService,
    private readonly purchaseOrderApi: PurchaseOrderApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly itemApi: ItemApiService,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.receiveForm = this.formBuilder.group({
      purchaseOrderId: [null as string | null, Validators.required],
      storeId: [{ value: null as string | null, disabled: true }, Validators.required],
      supplierId: [{ value: null as string | null, disabled: true }, Validators.required],
      receiveDate: [null as Date | null, Validators.required],
      items: this.formBuilder.array(
        [this.createItemGroup()],
        this.receivedQtyAgainstPoValidator,
      ),
    });
  }

  get f() {
    return this.receiveForm.controls;
  }

  get itemRows(): FormArray {
    return this.receiveForm.get('items') as FormArray;
  }

  get canEdit(): boolean {
    return isItemReceiveEditable(this.loadedRecord?.receiveStatus);
  }

  get itemsTotal(): number {
    return this.itemRows.controls.reduce(
      (sum, row) => sum + this.lineTotalFor(row.getRawValue()),
      0,
    );
  }

  ngOnInit(): void {
    this.receiveId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.receiveId) {
      this.toastr.error('Receive id is missing');
      void this.router.navigate(['/receives/list']);
      return;
    }

    this.setupItemTypeahead();
    this.setupPurchaseOrderTypeahead();
    this.loadStores();
    this.loadPackSizes();
    this.loadReceive();
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
    return this.lineTotalFor(this.itemRow(index).getRawValue());
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

  onPurchaseOrderChange(selected: string | PurchaseOrderResponse | null): void {
    if (this.loadingRecord || !this.canEdit) {
      return;
    }
    const requestVersion = ++this.purchaseOrderRequestVersion;
    const purchaseOrderId =
      typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!purchaseOrderId) {
      this.applyingPurchaseOrder = false;
      this.purchaseOrderItems = [];
      this.receiveForm.patchValue({ storeId: null, supplierId: null });
      this.replaceItemRows([]);
      return;
    }

    // Remove the previous order's lines before loading the new order.
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
    if (this.loadingRecord || this.applyingPurchaseOrder || !this.canEdit) {
      return;
    }
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!itemId) {
      this.itemRow(index).patchValue({ itemName: '', unitPrice: null, uom: null });
      this.syncReceivedQtyMaxValidators();
      return;
    }

    const row = this.itemRow(index);
    this.syncReceivedQtyMaxValidators();
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
          this.syncReceivedQtyMaxValidators();
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (!this.canEdit) {
      this.toastr.error('Only draft receives can be updated');
      return;
    }
    this.receiveForm.markAllAsTouched();
    if (this.receiveForm.invalid || this.loading || !this.receiveId) {
      if (this.receivedQtyExceedsPurchaseOrder()) {
        this.toastr.error('Received quantity cannot exceed purchase order quantity');
      }
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
      .updateReceive(this.receiveId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Receive updated successfully');
          void this.router.navigate(['/receives/list']);
        },
      });
  }

  onClear(): void {
    ++this.purchaseOrderRequestVersion;
    this.applyingPurchaseOrder = false;
    if (this.loadedRecord) {
      this.patchForm(this.loadedRecord);
      this.submitted = false;
    }
  }

  private loadReceive(): void {
    this.loadingRecord = true;
    this.receiveApi
      .getReceiveById(this.receiveId)
      .pipe(finalize(() => (this.loadingRecord = false)))
      .subscribe({
        next: (record) => this.patchForm(record),
        error: () => {
          void this.router.navigate(['/receives/list']);
        },
      });
  }

  private patchForm(record: ReceiveResponse): void {
    this.loadedRecord = record;
    this.receiveNcId = record.receiveNcId || '';
    this.statusLabel = itemReceiveStatusLabel(record.receiveStatus);

    this.receiveForm.patchValue(
      {
        purchaseOrderId: record.purchaseOrderId ?? null,
        storeId: record.storeId ?? null,
        supplierId: record.supplierId ?? null,
        receiveDate: toDatePickerValue(record.receiveDate),
      },
      { emitEvent: false },
    );

    this.itemRows.clear();
    this.itemOptions = [];
    const items = record.items?.length ? record.items : [undefined];
    for (const item of items) {
      this.itemRows.push(this.createItemGroup(item));
      if (item?.itemId) {
        this.itemOptions = this.mergeOptions(this.itemOptions, [
          { id: item.itemId, itemName: item.itemName },
        ]);
      }
      if (item?.uom) {
        this.ensurePackSizeOption(undefined, item.uom);
      }
    }

    this.ensureSelectedStore(record.storeId);
    this.ensureSelectedSupplier(record.supplierId);
    this.loadPurchaseOrderLimits(record.purchaseOrderId);
    this.syncUomSelections();
    this.syncFormEnabledState();
  }

  private createItemGroup(item?: ReceiveItemResponse): FormGroup {
    return this.formBuilder.group({
      itemId: [item?.itemId ?? null, Validators.required],
      itemName: [item?.itemName ?? ''],
      receivedQty: [
        item?.receivedQty ?? null,
        this.receivedQtyValidators(item?.itemId ?? null),
      ],
      rejectedQty: [item?.rejectedQty ?? null, [Validators.min(0)]],
      unitPrice: [item?.unitPrice ?? null, [Validators.required, Validators.min(0)]],
      uom: [null as string | null],
      batchNo: [
        item?.batchNo || this.nextBatchNo(),
        [Validators.required, Validators.maxLength(30)],
      ],
      expireDate: [toDatePickerValue(item?.expireDate)],
      remarks: [item?.remarks ?? '', [Validators.maxLength(255)]],
    });
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

  maxReceivedQtyFor(itemId: string | null | undefined): number | null {
    return this.orderedQtyForItem(itemId);
  }

  receivedQtyExceedsPurchaseOrder(): boolean {
    return (
      !!this.itemRows.errors?.['receivedQtyExceedsPo'] ||
      this.itemRows.controls.some((row) => !!row.get('receivedQty')?.errors?.['max'])
    );
  }

  private applyPurchaseOrder(order: PurchaseOrderResponse): void {
    this.purchaseOrderOptions = this.mergeOptions(this.purchaseOrderOptions, [order]);
    this.purchaseOrderItems = order.items ?? [];
    this.receiveForm.patchValue({
      storeId: order.storeId ?? null,
      supplierId: order.supplierId ?? null,
    });
    this.ensureSelectedStore(order.storeId);
    this.ensureSelectedSupplier(order.supplierId);
    this.replaceItemRows(order.items?.filter((item) => !!item.itemId) ?? []);
  }

  private replaceItemRows(items: PurchaseOrderItemResponse[]): void {
    this.itemRows.clear();
    this.itemOptions = [];
    if (!items.length) {
      this.itemRows.push(this.createItemGroup());
      return;
    }

    for (const item of items) {
      this.itemRows.push(
        this.createItemGroup({
          itemId: item.itemId,
          itemName: item.itemName,
          receivedQty: item.orderedQty,
          unitPrice: item.unitPrice,
        }),
      );
      if (item.itemId) {
        this.itemOptions = this.mergeOptions(this.itemOptions, [
          { id: item.itemId, itemName: item.itemName },
        ]);
      }
    }
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
        this.ensureSelectedStore(this.receiveForm.getRawValue().storeId);
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
        this.syncUomSelections();
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
    return match?.id ?? uom;
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

  private syncUomSelections(): void {
    if (!this.loadedRecord) {
      return;
    }

    for (const [index, item] of (this.loadedRecord.items ?? []).entries()) {
      const row = this.itemRows.at(index);
      if (!row || !item?.uom) {
        continue;
      }
      row.patchValue({ uom: this.resolveUomId(item.uom) }, { emitEvent: false });
    }
  }

  private ensurePackSizeOption(packSizeId?: string, packSizeName?: string): void {
    if (packSizeId && !this.packSizeOptions.some((lookup) => lookup.id === packSizeId)) {
      this.packSizeOptions = [
        { id: packSizeId, lookupName: packSizeName || packSizeId },
        ...this.packSizeOptions,
      ];
      return;
    }

    if (
      packSizeName &&
      !this.packSizeOptions.some(
        (lookup) =>
          lookup.id === packSizeName ||
          lookup.lookupName === packSizeName ||
          lookup.parentFullName === packSizeName,
      )
    ) {
      this.packSizeOptions = [
        { id: packSizeName, lookupName: packSizeName },
        ...this.packSizeOptions,
      ];
    }
  }

  private loadPurchaseOrderLimits(purchaseOrderId?: string): void {
    if (!purchaseOrderId) {
      this.purchaseOrderItems = [];
      this.syncReceivedQtyMaxValidators();
      return;
    }
    this.purchaseOrderApi.getPurchaseOrderById(purchaseOrderId).subscribe({
      next: (order) => {
        if (!order?.id) {
          return;
        }
        this.purchaseOrderOptions = this.mergeOptions(this.purchaseOrderOptions, [order]);
        this.purchaseOrderItems = order.items ?? [];
        this.syncReceivedQtyMaxValidators();
      },
    });
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

  private receivedQtyValidators(itemId: string | null): ValidatorFn[] {
    const validators: ValidatorFn[] = [Validators.required, Validators.min(0.01)];
    const ordered = this.orderedQtyForItem(itemId);
    if (ordered != null) {
      validators.push(Validators.max(ordered));
    }
    return validators;
  }

  private orderedQtyForItem(itemId: string | null | undefined): number | null {
    if (!itemId || !this.purchaseOrderItems.length) {
      return null;
    }
    const matching = this.purchaseOrderItems.filter((item) => item.itemId === itemId);
    if (!matching.length) {
      return null;
    }
    return matching.reduce((sum, item) => sum + Number(item.orderedQty || 0), 0);
  }

  private syncReceivedQtyMaxValidators(): void {
    for (const row of this.itemRows.controls) {
      const itemId = row.get('itemId')?.value as string | null;
      const ctrl = row.get('receivedQty');
      ctrl?.setValidators(this.receivedQtyValidators(itemId));
      ctrl?.updateValueAndValidity({ emitEvent: false });
    }
    this.itemRows.updateValueAndValidity({ emitEvent: false });
  }

  private syncFormEnabledState(): void {
    if (this.canEdit) {
      this.receiveForm.enable({ emitEvent: false });
      this.receiveForm.get('storeId')?.disable({ emitEvent: false });
      this.receiveForm.get('supplierId')?.disable({ emitEvent: false });
      return;
    }
    this.receiveForm.disable({ emitEvent: false });
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
