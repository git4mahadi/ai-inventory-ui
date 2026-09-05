import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
import {
  CellClickedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IGetRowsParams,
  PaginationNumberFormatterParams,
} from 'ag-grid-community';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { normalizeItem, normalizePage } from '../../../core/utils/api-response.util';
import { ItemDto } from '../../../models/dto/ItemDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { SupplierResponse } from '../../../models/response/SupplierResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { SupplierSearchDto } from '../../../models/search/SupplierSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { StoreApiService } from '../../../services/StoreApiService';
import { SupplierApiService } from '../../../services/SupplierApiService';
import { appGridDefaultColDef, appGridModules, appGridTheme } from '../../../shared/utils/ag-grid.util';
import { AuthService } from '../../../core/services/auth.service';
import {
  crudAccess,
  hideActionsColumnIfNeeded,
  renderCrudActionButtons,
} from '../../../shared/utils/crud-access.util';

@Component({
  selector: 'app-item-list',
  standalone: false,
  templateUrl: './item-list.component.html',
  styleUrl: './item-list.component.scss',
})
export class ItemListComponent implements OnInit, OnDestroy {
  @ViewChild('itemFormShell') itemFormShell?: ElementRef<HTMLElement>;
  readonly itemForm: FormGroup;
  readonly searchForm: FormGroup;
  readonly storeTypeahead$ = new Subject<string>();
  readonly supplierTypeahead$ = new Subject<string>();
  readonly columnDefs: ColDef<ItemResponse>[] = [
    {
      field: 'itemName',
      headerName: 'Name',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'item-name',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'itemCode',
      headerName: 'Code',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'itemBarcode',
      headerName: 'Barcode',
      flex: 1,
      minWidth: 135,
      cellClass: 'cell-mono',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'supplierName',
      headerName: 'Supplier',
      flex: 1.2,
      minWidth: 160,
      cellClass: 'cell-muted',
      tooltipField: 'supplierName',
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'categoryName',
      headerName: 'Category',
      flex: 1,
      minWidth: 130,
      valueFormatter: (params) => params.value || '—',
    },
    {
      field: 'purchaseRate',
      headerName: 'Purchase',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'salesRate',
      headerName: 'Sales',
      flex: 0.8,
      minWidth: 110,
      cellClass: 'cell-mono',
      valueFormatter: (params) => this.formatNumber(params.value),
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      width: 90,
      minWidth: 90,
      maxWidth: 90,
      cellClass: 'col-enabled',
      sortable: false,
      cellRenderer: (params: ICellRendererParams<ItemResponse>) =>
        this.renderEnabledCell(!!params.value),
    },
    {
      colId: 'actions',
      headerName: 'Actions',
      width: 102,
      minWidth: 102,
      maxWidth: 102,
      cellClass: 'col-actions',
      sortable: false,
      resizable: false,
      cellRenderer: (params: ICellRendererParams<ItemResponse>) =>
        this.renderActionsCell(params.data),
    },
  ];
  readonly defaultColDef = appGridDefaultColDef;
  readonly gridTheme = appGridTheme;
  readonly gridModules = appGridModules;
  readonly dataSource: IDatasource = {
    getRows: (params) => this.getItemRows(params),
  };
  readonly paginationNumberFormatter = (
    params: PaginationNumberFormatterParams<ItemResponse>,
  ): string => formatToBdNumberingSystem(params.value, 0);

  items: ItemResponse[] = [];
  storeOptions: StoreResponse[] = [];
  supplierOptions: SupplierResponse[] = [];
  packSizeOptions: LookupResponse[] = [];
  locationOptions: LookupResponse[] = [];
  categoryOptions: LookupResponse[] = [];

  loadingStores = false;
  loadingSuppliers = false;
  loadingLookups = false;
  loadingCategories = false;
  submitted = false;
  saving = false;
  loading = false;
  hasLoaded = false;
  editingId: string | null = null;
  deletingId: string | null = null;
  pendingDelete: ItemResponse | null = null;
  canCreate = false;
  canUpdate = false;
  canDelete = false;
  private gridApi?: GridApi<ItemResponse>;
  private readonly destroy$ = new Subject<void>();

  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly storeApi: StoreApiService,
    private readonly supplierApi: SupplierApiService,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
  ) {
    const access = crudAccess(this.authService, 'ROLE_ITEM');
    this.canCreate = access.canCreate;
    this.canUpdate = access.canUpdate;
    this.canDelete = access.canDelete;
    hideActionsColumnIfNeeded(this.columnDefs, access);
    this.itemForm = this.formBuilder.group({
      itemName: ['', [Validators.required, Validators.maxLength(255)]],
      itemCode: ['', [Validators.required, Validators.maxLength(20)]],
      itemBarcode: ['', [Validators.maxLength(20)]],
      strength: ['', [Validators.maxLength(50)]],
      storeId: [null as string | null, Validators.required],
      categoryId: [null as string | null],
      supplierId: [null as string | null],
      packSizeId: [null as string | null],
      locationId: [null as string | null],
      purchaseRate: [null, [Validators.required, Validators.min(0)]],
      salesRate: [null, [Validators.required, Validators.min(0)]],
      reOrderLevel: [null, [Validators.min(0)]],
      expireNotifyDays: [null, [Validators.min(0)]],
      isMedicineItem: [false],
      isForeignItem: [false],
      enabled: [true],
    });
    this.searchForm = this.formBuilder.group({
      searchTerm: [''],
      itemName: [''],
      itemCode: [''],
      itemBarcode: [''],
      categoryId: [null as string | null],
      isMedicineItem: [null as boolean | null],
    });
  }

  get f() {
    return this.itemForm.controls;
  }

  get showForm(): boolean {
    return this.canCreate || (this.isEditing && this.canUpdate);
  }

  get canSave(): boolean {
    return this.isEditing ? this.canUpdate : this.canCreate;
  }

  get isEditing(): boolean {
    return !!this.editingId;
  }

  get deleteDialogMessage(): string {
    return 'This will permanently remove the item and cannot be undone.';
  }

  get deleteDialogDetail(): string {
    return this.pendingDelete?.itemName || this.pendingDelete?.id || '';
  }

  ngOnInit(): void {
    this.loadStores();
    this.loadLookups();
    this.setupStoreTypeahead();
    this.setupSupplierTypeahead();

    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.loadItemForEdit(routeId);
    }
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

  onGridReady(event: GridReadyEvent<ItemResponse>): void {
    this.gridApi = event.api;
  }

  onCellClicked(event: CellClickedEvent<ItemResponse>): void {
    const target = event.event?.target;
    if (!(target instanceof HTMLElement) || event.colDef.colId !== 'actions' || !event.data) {
      return;
    }

    const action = target.closest<HTMLElement>('[data-action]')?.dataset['action'];
    if (action === 'edit' && this.canUpdate) {
      this.startEdit(event.data);
    } else if (action === 'delete' && this.canDelete) {
      this.requestDelete(event.data);
    }
  }

  onSearch(): void {
    this.reloadGrid();
  }

  onReset(): void {
    this.searchForm.reset({
      searchTerm: '',
      itemName: '',
      itemCode: '',
      itemBarcode: '',
      categoryId: null,
      isMedicineItem: null,
    });
    this.reloadGrid();
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.itemForm.invalid || this.saving || !this.canSave) {
      return;
    }

    const value = this.itemForm.value;
    const dto = new ItemDto({
      itemName: value.itemName?.trim(),
      itemCode: value.itemCode?.trim(),
      itemBarcode: value.itemBarcode?.trim() || undefined,
      strength: value.strength?.trim() || undefined,
      storeId: value.storeId,
      categoryId: value.categoryId || undefined,
      supplierId: value.supplierId || undefined,
      packSizeId: value.packSizeId || undefined,
      locationId: value.locationId || undefined,
      purchaseRate: Number(value.purchaseRate),
      salesRate: Number(value.salesRate),
      reOrderLevel: Number(value.reOrderLevel ?? 0),
      expireNotifyDays: Number(value.expireNotifyDays ?? 0),
      isMedicineItem: !!value.isMedicineItem,
      isForeignItem: !!value.isForeignItem,
      enabled: !!value.enabled,
    });

    this.saving = true;
    const request$ = this.editingId
      ? this.itemApi.updateItem(this.editingId, dto)
      : this.itemApi.createItem(dto);

    request$.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toastr.success(
          this.editingId ? 'Item updated successfully' : 'Item created successfully',
        );
        this.resetForm();
        this.reloadGrid();
      },
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.submitted = false;
    this.itemForm.reset({
      itemName: '',
      itemCode: '',
      itemBarcode: '',
      strength: '',
      storeId: null,
      categoryId: null,
      supplierId: null,
      packSizeId: null,
      locationId: null,
      purchaseRate: null,
      salesRate: null,
      reOrderLevel: null,
      expireNotifyDays: null,
      isMedicineItem: false,
      isForeignItem: false,
      enabled: true,
    });
    this.supplierOptions = [];
    if (this.route.snapshot.paramMap.get('id')) {
      void this.router.navigate(['/items']);
    }
  }

  requestDelete(item: ItemResponse): void {
    if (!item.id || this.deletingId || !this.canDelete) {
      return;
    }
    this.pendingDelete = item;
  }

  cancelDelete(): void {
    if (this.deletingId) {
      return;
    }
    this.pendingDelete = null;
  }

  confirmDelete(): void {
    const item = this.pendingDelete;
    if (!item?.id) {
      return;
    }

    this.deletingId = item.id;
    this.refreshActionCells(item.id);
    this.itemApi
      .deleteItem(item.id)
      .pipe(
        finalize(() => {
          this.deletingId = null;
          this.pendingDelete = null;
          this.refreshActionCells();
        }),
      )
      .subscribe({
        next: () => {
          this.toastr.success('Item deleted successfully');
          if (this.editingId === item.id) {
            this.resetForm();
          }
          this.gridApi?.refreshInfiniteCache();
        },
      });
  }

  private startEdit(item: ItemResponse): void {
    if (!this.canUpdate) {
      return;
    }
    const normalized = normalizeItem(item);
    if (!normalized?.id) {
      return;
    }

    this.patchFormForEdit(normalized);
    this.itemFormShell?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.itemApi.getItemById(normalized.id).subscribe({
      next: (full) => {
        if (this.editingId === normalized.id) {
          this.patchFormForEdit(full);
        }
      },
    });
  }

  private loadItemForEdit(id: string): void {
    if (!this.canUpdate) {
      this.resetForm();
      return;
    }
    this.itemApi.getItemById(id).subscribe({
      next: (item) => this.patchFormForEdit(item),
      error: () => this.resetForm(),
    });
  }

  private patchFormForEdit(item: ItemResponse): void {
    const normalized = normalizeItem(item);
    if (!normalized?.id) {
      return;
    }

    this.editingId = normalized.id;
    this.submitted = false;
    this.itemForm.patchValue(
      {
        itemName: normalized.itemName ?? '',
        itemCode: normalized.itemCode ?? '',
        itemBarcode: normalized.itemBarcode ?? '',
        strength: normalized.strength ?? '',
        storeId: normalized.storeId ?? null,
        categoryId: normalized.categoryId ?? null,
        supplierId: normalized.supplierId ?? null,
        packSizeId: normalized.packSizeId ?? null,
        locationId: normalized.locationId ?? null,
        purchaseRate: normalized.purchaseRate ?? 0,
        salesRate: normalized.salesRate ?? 0,
        reOrderLevel: normalized.reOrderLevel ?? 0,
        expireNotifyDays: normalized.expireNotifyDays ?? 0,
        isMedicineItem: normalized.isMedicineItem ?? false,
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
      item.categoryId &&
      !this.categoryOptions.some((lookup) => lookup.id === item.categoryId)
    ) {
      this.categoryOptions = [
        {
          id: item.categoryId,
          lookupName: item.categoryName,
        },
        ...this.categoryOptions,
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

  private getItemRows(params: IGetRowsParams<ItemResponse>): void {
    this.loading = true;
    const formValue = this.searchForm.value;
    const pageSize = this.size;
    const pageNumber = Math.floor(params.startRow / pageSize);
    const request = new ItemSearchDto({
      searchTerm: formValue.searchTerm?.trim() || undefined,
      itemName: formValue.itemName?.trim() || undefined,
      itemCode: formValue.itemCode?.trim() || undefined,
      itemBarcode: formValue.itemBarcode?.trim() || undefined,
      categoryId: formValue.categoryId || undefined,
      isMedicineItem:
        formValue.isMedicineItem === null || formValue.isMedicineItem === undefined
          ? undefined
          : !!formValue.isMedicineItem,
      page: pageNumber,
      size: pageSize,
    });

    this.itemApi
      .searchPage(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          const page = normalizePage<ItemResponse>(result);
          const rows = [...(page.content ?? [])];
          this.items = rows;
          this.totalElements = page.totalElements ?? rows.length;
          this.totalPages = page.totalPages ?? Math.ceil(this.totalElements / pageSize);
          this.page = pageNumber;
          this.hasLoaded = true;
          params.successCallback(rows, this.totalElements);
        },
        error: () => {
          this.items = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.hasLoaded = true;
          params.failCallback();
        },
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
        this.storeOptions = stores;
      });
  }

  private loadLookups(): void {
    this.loadingLookups = true;
    this.loadingCategories = true;
    this.lookupApi
      .getLookupListByKeys([
        LookupEnum.PACK_SIZE.key,
        LookupEnum.LOCATION.key,
        LookupEnum.CATEGORY.key,
      ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingLookups = false;
          this.loadingCategories = false;
        }),
      )
      .subscribe((lookupsByKey) => {
        this.packSizeOptions = lookupsByKey[LookupEnum.PACK_SIZE.key] ?? [];
        this.locationOptions = lookupsByKey[LookupEnum.LOCATION.key] ?? [];
        this.categoryOptions = lookupsByKey[LookupEnum.CATEGORY.key] ?? [];
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

  private reloadGrid(): void {
    this.hasLoaded = false;
    this.loading = true;
    this.items = [];
    this.totalElements = 0;
    this.totalPages = 0;
    this.gridApi?.setGridOption('datasource', this.dataSource);
  }

  private refreshActionCells(itemId?: string): void {
    if (!this.gridApi) {
      return;
    }
    this.gridApi.refreshCells({
      rowNodes: itemId
        ? this.gridApi.getRenderedNodes().filter((rowNode) => rowNode.data?.id === itemId)
        : undefined,
      columns: ['actions'],
      force: true,
    });
  }

  private formatNumber(value: number | undefined): string {
    return value == null ? '—' : formatToBdNumberingSystem(value);
  }

  private renderEnabledCell(enabled: boolean): string {
    const icon = enabled ? 'icon-enabled.svg' : 'icon-disabled.svg';
    const state = enabled ? 'enabled' : 'disabled';
    return `
      <span class="enabled-status is-${state}" title="${enabled ? 'Enabled' : 'Disabled'}">
        <span class="enabled-status-icon">
          <img src="/assets/svg/${icon}" alt="" width="12" height="12" />
        </span>
      </span>
    `;
  }

  private renderActionsCell(item: ItemResponse | undefined): string {
    if (!item) {
      return '';
    }

    return renderCrudActionButtons({
      canUpdate: this.canUpdate,
      canDelete: this.canDelete,
      deleting: this.deletingId === item.id,
      entityLabel: 'item',
    });
  }

}
