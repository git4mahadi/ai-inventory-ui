import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { renderBarcode } from '../../../core/utils/barcode.util';
import { ItemResponse } from '../../../models/response/ItemResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { ItemSearchDto } from '../../../models/search/ItemSearchDto';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ItemApiService } from '../../../services/ItemApiService';
import { StoreApiService } from '../../../services/StoreApiService';

export interface BarcodeCartItem {
  itemId: string;
  itemName: string;
  itemCode?: string;
  itemBarcode: string;
  salesRate?: number;
  count: number;
}

export interface BarcodePrintLabel {
  key: string;
  itemName: string;
  itemCode?: string;
  barcode: string;
  salesRate?: number;
}

@Component({
  selector: 'app-item-barcode-generate',
  standalone: false,
  templateUrl: './item-barcode-generate.component.html',
  styleUrl: './item-barcode-generate.component.scss',
})
export class ItemBarcodeGenerateComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChildren('labelBarcode') barcodeEls?: QueryList<ElementRef<SVGElement>>;

  readonly pickerForm: FormGroup;
  readonly itemTypeahead$ = new Subject<string>();

  storeOptions: StoreResponse[] = [];
  itemOptions: ItemResponse[] = [];
  cartItems: BarcodeCartItem[] = [];
  printLabels: BarcodePrintLabel[] = [];
  private selectedPickerItem: ItemResponse | null = null;

  loadingStores = false;
  loadingItems = false;

  private readonly destroy$ = new Subject<void>();
  private pendingPrint = false;
  private renderedLabelKey = '';
  private afterPrintHandler: (() => void) | null = null;
  private a4PageStyle: HTMLStyleElement | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly itemApi: ItemApiService,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
  ) {
    this.pickerForm = this.formBuilder.group({
      storeId: [null as string | null, Validators.required],
      itemId: [null as string | null],
      count: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    });
  }

  get f() {
    return this.pickerForm.controls;
  }

  get labelCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.count, 0);
  }

  ngOnInit(): void {
    this.loadStores();
    this.setupItemTypeahead();
    this.pickerForm.get('itemId')?.disable({ emitEvent: false });
    this.pickerForm
      .get('storeId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((storeId) => {
        this.itemOptions = [];
        this.selectedPickerItem = null;
        this.cartItems = [];
        this.printLabels = [];
        this.pickerForm.patchValue({ itemId: null, count: 1 }, { emitEvent: false });
        if (storeId) {
          this.pickerForm.get('itemId')?.enable({ emitEvent: false });
        } else {
          this.pickerForm.get('itemId')?.disable({ emitEvent: false });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupPrintMode();
  }

  ngAfterViewChecked(): void {
    this.renderLabelBarcodes();
  }

  storeLabel(store: StoreResponse): string {
    const name = store.storeName || store.id || '';
    return store.storeCode ? `${name} (${store.storeCode})` : name;
  }

  itemLabel(item: ItemResponse | string | null | undefined): string {
    const resolved = typeof item === 'string' ? this.resolveSelectedItem(item) : item;
    if (!resolved) {
      return typeof item === 'string' ? item : '';
    }
    const name = resolved.itemName || resolved.id || '';
    return resolved.itemCode ? `${name} (${resolved.itemCode})` : name;
  }

  onPickerItemChange(selected: string | ItemResponse | null): void {
    const item = this.resolveSelectedItem(selected);
    this.selectedPickerItem = item;
    if (!item) {
      return;
    }
    if (!this.itemBarcodeOf(item)) {
      this.toastr.warning(`${item.itemName || 'This item'} has no barcode`);
      this.selectedPickerItem = null;
      this.pickerForm.patchValue({ itemId: null });
    } else if (!this.itemOptions.some((option) => option.id === item.id)) {
      this.itemOptions = [item, ...this.itemOptions];
    }
  }

  addItem(): void {
    const storeId = this.pickerForm.get('storeId')?.value as string | null;
    if (!storeId) {
      this.toastr.error('Select a store first');
      return;
    }

    const item =
      this.resolveSelectedItem(this.pickerForm.get('itemId')?.value) ?? this.selectedPickerItem;
    const itemId = item?.id ?? null;
    if (!itemId || !item) {
      this.toastr.error('Select an item');
      return;
    }

    const barcode = this.itemBarcodeOf(item);
    if (!barcode) {
      this.toastr.warning(`${item.itemName || 'This item'} has no barcode`);
      this.pickerForm.patchValue({ itemId: null });
      return;
    }

    const count = this.normalizedCount(this.pickerForm.get('count')?.value);
    const existing = this.cartItems.find((row) => row.itemId === itemId);
    if (existing) {
      existing.count = Math.min(99, existing.count + count);
      this.cartItems = [...this.cartItems];
    } else {
      this.cartItems = [
        ...this.cartItems,
        {
          itemId,
          itemName: item.itemName || itemId,
          itemCode: item.itemCode,
          itemBarcode: barcode,
          salesRate: item.salesRate,
          count,
        },
      ];
    }

    this.printLabels = [];
    this.selectedPickerItem = null;
    this.pickerForm.patchValue({ itemId: null, count: 1 });
  }

  removeItem(index: number): void {
    this.cartItems = this.cartItems.filter((_, itemIndex) => itemIndex !== index);
    this.printLabels = [];
  }

  onCountChange(index: number, value: number | string | null): void {
    const item = this.cartItems[index];
    if (!item) {
      return;
    }
    item.count = this.normalizedCount(value);
    this.cartItems = [...this.cartItems];
    this.printLabels = [];
  }

  generateAndPrint(): void {
    if (!this.cartItems.length) {
      this.toastr.error('Add at least one item');
      return;
    }

    const missing = this.cartItems.filter((item) => !item.itemBarcode?.trim());
    if (missing.length) {
      this.toastr.warning(
        `${missing[0].itemName} has no barcode` +
          (missing.length > 1 ? ` and ${missing.length - 1} more` : ''),
      );
      return;
    }

    this.printLabels = this.buildLabels();
    this.renderedLabelKey = '';
    this.pendingPrint = true;
  }

  printSheet(): void {
    if (!this.printLabels.length) {
      this.toastr.error('Generate barcodes first');
      return;
    }
    document.body.classList.add('barcode-sheet-open');
    this.ensureA4PageStyle();
    this.removeAfterPrintListener();
    this.afterPrintHandler = () => this.cleanupPrintMode();
    window.addEventListener('afterprint', this.afterPrintHandler);
    window.print();
  }

  private buildLabels(): BarcodePrintLabel[] {
    const labels: BarcodePrintLabel[] = [];
    for (const item of this.cartItems) {
      for (let index = 0; index < item.count; index += 1) {
        labels.push({
          key: `${item.itemId}-${index}`,
          itemName: item.itemName,
          itemCode: item.itemCode,
          barcode: item.itemBarcode,
          salesRate: item.salesRate,
        });
      }
    }
    return labels;
  }

  private renderLabelBarcodes(): void {
    const key = this.printLabels.map((label) => label.key).join('|');
    const elements = this.barcodeEls?.toArray() ?? [];
    if (!this.printLabels.length || elements.length !== this.printLabels.length) {
      return;
    }
    if (key === this.renderedLabelKey) {
      return;
    }

    this.printLabels.forEach((label, index) => {
      const svg = elements[index]?.nativeElement;
      if (svg) {
        renderBarcode(svg, label.barcode, {
          height: 36,
          width: 1.15,
          fontSize: 10,
          margin: 0,
          textMargin: 1,
        });
      }
    });
    this.renderedLabelKey = key;

    if (this.pendingPrint) {
      this.pendingPrint = false;
      setTimeout(() => this.printSheet(), 50);
    }
  }

  private resolveSelectedItem(selected: unknown): ItemResponse | null {
    if (!selected) {
      return null;
    }
    if (typeof selected === 'object') {
      const item = selected as ItemResponse;
      if (item.id) {
        this.selectedPickerItem = item;
        return item;
      }
      return null;
    }
    if (typeof selected !== 'string') {
      return null;
    }
    if (this.selectedPickerItem?.id === selected) {
      return this.selectedPickerItem;
    }
    return this.itemOptions.find((option) => option.id === selected) ?? null;
  }

  private itemBarcodeOf(item: ItemResponse): string {
    return item.itemBarcode?.trim() || '';
  }

  private normalizedCount(value: unknown): number {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1;
    }
    return Math.min(99, parsed);
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
        this.itemOptions = this.mergeOptions(this.keptSelectedItem(), items);
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

  private searchItems(term: string) {
    const searchTerm = term?.trim();
    const storeId = this.pickerForm.get('storeId')?.value as string | null;
    if (!storeId) {
      return of(this.keptSelectedItem());
    }
    if (!searchTerm || searchTerm.length < 2) {
      return of(this.keptSelectedItem());
    }

    this.loadingItems = true;
    return this.itemApi
      .searchTerm(
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

  private keptSelectedItem(): ItemResponse[] {
    const selectedId =
      this.selectedPickerItem?.id ?? this.itemIdFromValue(this.pickerForm.get('itemId')?.value);
    if (!selectedId) {
      return [];
    }
    if (this.selectedPickerItem?.id === selectedId) {
      return [this.selectedPickerItem];
    }
    return this.itemOptions.filter((item) => item.id === selectedId);
  }

  private itemIdFromValue(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && 'id' in value) {
      return (value as ItemResponse).id ?? null;
    }
    return null;
  }

  private mergeOptions(kept: ItemResponse[], incoming: ItemResponse[]): ItemResponse[] {
    const map = new Map<string, ItemResponse>();
    for (const option of [...kept, ...incoming]) {
      if (option.id) {
        map.set(option.id, option);
      }
    }
    return [...map.values()];
  }

  private ensureA4PageStyle(): void {
    if (this.a4PageStyle) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'barcode-a4-page';
    style.textContent = '@media print { @page { size: A4 portrait; margin: 8mm; } }';
    document.head.appendChild(style);
    this.a4PageStyle = style;
  }

  private cleanupPrintMode(): void {
    document.body.classList.remove('barcode-sheet-open');
    this.a4PageStyle?.remove();
    this.a4PageStyle = null;
    this.removeAfterPrintListener();
  }

  private removeAfterPrintListener(): void {
    if (this.afterPrintHandler) {
      window.removeEventListener('afterprint', this.afterPrintHandler);
      this.afterPrintHandler = null;
    }
  }
}
