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
import { generateBatchNo } from '../../../core/utils/batch-no.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { OpeningStockDto } from '../../../models/dto/OpeningStockDto';
import { OpeningStockItemDto } from '../../../models/dto/OpeningStockItemDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { FinancialYearResponse } from '../../../models/response/FinancialYearResponse';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { OpeningStockItemResponse } from '../../../models/response/OpeningStockItemResponse';
import { OpeningStockResponse } from '../../../models/response/OpeningStockResponse';
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

@Component({
  selector: 'app-opening-stock-edit',
  standalone: false,
  templateUrl: './opening-stock-edit.component.html',
  styleUrl: './opening-stock-edit.component.scss',
})
export class OpeningStockEditComponent implements OnInit, OnDestroy {
  readonly openingStockForm: FormGroup;
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

  loadingStores = false;
  loadingFinancialYears = false;
  loadingItems = false;
  loadingSuppliers = false;
  loadingLookups = false;

  submitted = false;
  loading = false;
  loadingRecord = true;
  openingStockId = '';
  openingStockNcId = '';

  private loadedRecord: OpeningStockResponse | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly openingStockApi: OpeningStockApiService,
    private readonly storeApi: StoreApiService,
    private readonly financialYearApi: FinancialYearApiService,
    private readonly itemApi: ItemApiService,
    private readonly lookupApi: LookupApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.openingStockForm = this.formBuilder.group({
      challanNo: ['', [Validators.maxLength(50)]],
      challanDate: [null as Date | null, Validators.required],
      financialYearId: [null as string | null, Validators.required],
      storeId: [null as string | null, Validators.required],
      items: this.formBuilder.array([this.createItemGroup()]),
    });
  }

  get f() {
    return this.openingStockForm.controls;
  }

  get itemRows(): FormArray {
    return this.openingStockForm.get('items') as FormArray;
  }

  get itemsTotal(): number {
    return this.itemRows.controls.reduce((sum, row) => {
      const qty = Number(row.get('stockQty')?.value || 0);
      const rate = Number(row.get('purchaseRate')?.value || 0);
      return sum + qty * rate;
    }, 0);
  }

  ngOnInit(): void {
    this.openingStockId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.openingStockId) {
      this.toastr.error('Opening stock id is missing');
      void this.router.navigate(['/opening-stocks/list']);
      return;
    }

    this.setupItemTypeahead();
    this.setupSupplierTypeahead();
    this.loadStores();
    this.loadFinancialYears();
    this.loadPackSizes();
    this.loadOpeningStock();
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

  itemRow(index: number): FormGroup {
    return this.itemRows.at(index) as FormGroup;
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

  onItemChange(index: number, selected: string | ItemResponse | null): void {
    if (this.loadingRecord) {
      return;
    }
    const itemId = typeof selected === 'string' ? selected : selected?.id ?? null;
    if (!itemId) {
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
            uom: item.packSizeId || null,
            purchaseRate: item.purchaseRate ?? null,
            salesRate: item.salesRate ?? null,
            supplierId: item.supplierId || null,
          });
          this.ensurePackSizeOption(item.packSizeId, item.packSizeName);
          this.ensureSupplierOption(item.supplierId, item.supplierName);
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.openingStockForm.invalid || this.loading || !this.openingStockId) {
      this.openingStockForm.markAllAsTouched();
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
      items: this.itemRows.controls.map((row) => {
        const rowValue = row.value;
        return new OpeningStockItemDto({
          supplierId: rowValue.supplierId || undefined,
          itemId: rowValue.itemId,
          itemName: rowValue.itemName?.trim() || undefined,
          stockQty: Number(rowValue.stockQty),
          uom: this.resolveUomName(rowValue.uom),
          batchNo: rowValue.batchNo?.trim(),
          expireDate: toApiDate(rowValue.expireDate),
          purchaseRate: Number(rowValue.purchaseRate),
          salesRate: Number(rowValue.salesRate),
        });
      }),
    });

    this.loading = true;
    this.openingStockApi
      .updateOpeningStock(this.openingStockId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Opening stock updated successfully');
          void this.router.navigate(['/opening-stocks/list']);
        },
      });
  }

  onClear(): void {
    if (this.loadedRecord) {
      this.patchForm(this.loadedRecord);
      this.submitted = false;
    }
  }

  private loadOpeningStock(): void {
    this.loadingRecord = true;
    this.openingStockApi
      .getOpeningStockById(this.openingStockId)
      .pipe(finalize(() => (this.loadingRecord = false)))
      .subscribe({
        next: (record) => {
          this.patchForm(record);
        },
        error: () => {
          void this.router.navigate(['/opening-stocks/list']);
        },
      });
  }

  private patchForm(record: OpeningStockResponse): void {
    this.loadedRecord = record;
    this.openingStockNcId = record.openingStockNcId || '';

    this.openingStockForm.patchValue(
      {
        challanNo: record.challanNo ?? '',
        challanDate: toDatePickerValue(record.challanDate),
        financialYearId: record.financialYearId ?? null,
        storeId: record.storeId ?? null,
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
      if (item?.supplierId) {
        this.ensureSupplierOption(item.supplierId);
      }
      if (item?.uom) {
        this.ensurePackSizeOption(undefined, item.uom);
      }
    }

    this.syncUomSelections();
    this.ensureSelectedRelations();
  }

  private createItemGroup(item?: OpeningStockItemResponse): FormGroup {
    return this.formBuilder.group({
      supplierId: [item?.supplierId ?? null],
      itemId: [item?.itemId ?? null, Validators.required],
      itemName: [item?.itemName ?? ''],
      stockQty: [item?.stockQty ?? null, [Validators.required, Validators.min(0.01)]],
      uom: [null as string | null],
      batchNo: [
        item?.batchNo || this.nextBatchNo(),
        [Validators.required, Validators.maxLength(30)],
      ],
      expireDate: [toDatePickerValue(item?.expireDate), []],
      purchaseRate: [item?.purchaseRate ?? null, [Validators.required, Validators.min(0)]],
      salesRate: [item?.salesRate ?? null, [Validators.required, Validators.min(0)]],
    });
  }

  private nextBatchNo(): string {
    return generateBatchNo(this.selectedStoreCode());
  }

  private selectedStoreCode(): string | null {
    const storeId = this.openingStockForm?.get('storeId')?.value as string | null;
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
        this.ensureSelectedFinancialYear();
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
          storeId: this.openingStockForm.get('storeId')?.value || undefined,
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
    const selectedIds = this.itemRows.controls
      .map((row) => row.get('supplierId')?.value as string | null)
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

  private syncUomSelections(): void {
    if (!this.loadedRecord) {
      return;
    }

    for (const [index, item] of (this.loadedRecord.items ?? []).entries()) {
      const row = this.itemRows.at(index);
      if (!row || !item?.uom) {
        continue;
      }
      const uomId = this.resolveUomId(item.uom) ?? item.uom;
      row.patchValue({ uom: uomId }, { emitEvent: false });
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

  private ensureSupplierOption(supplierId?: string, supplierName?: string): void {
    if (!supplierId || this.supplierOptions.some((supplier) => supplier.id === supplierId)) {
      return;
    }
    this.supplierOptions = [
      { id: supplierId, supplierName: supplierName || supplierId },
      ...this.supplierOptions,
    ];

    if (!supplierName) {
      this.supplierApi.getSupplierById(supplierId).subscribe({
        next: (supplier) => {
          if (!supplier?.id) {
            return;
          }
          this.supplierOptions = this.mergeOptions(this.supplierOptions, [supplier]);
        },
      });
    }
  }

  private ensureSelectedRelations(): void {
    this.ensureSelectedStore();
    this.ensureSelectedFinancialYear();
  }

  private ensureSelectedStore(): void {
    const storeId = this.openingStockForm.get('storeId')?.value as string | null;
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

  private ensureSelectedFinancialYear(): void {
    const fyId = this.openingStockForm.get('financialYearId')?.value as string | null;
    const fyCode = this.loadedRecord?.fyCode;
    if (
      fyId &&
      !this.financialYearOptions.some((fy) => fy.id === fyId)
    ) {
      this.financialYearOptions = this.mergeOptions(this.financialYearOptions, [
        { id: fyId, fyCode: fyCode || fyId },
      ]);
    }
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
}
