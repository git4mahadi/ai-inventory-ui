import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import { map } from 'rxjs/operators';
import { roundMoney, toNumber, onDecimalKeydown, sanitizeDecimalInput } from '../../../core/utils/sales-cart.util';
import { toApiDate, toDatePickerValue, toDisplayDate } from '../../../core/utils/date.util';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { ReturnDto } from '../../../models/dto/ReturnDto';
import { ReturnItemDto } from '../../../models/dto/ReturnItemDto';
import { invoiceStatusLabel } from '../../../models/enums/InvoiceStatus';
import { InvoiceItemResponse } from '../../../models/response/InvoiceItemResponse';
import { InvoiceResponse } from '../../../models/response/InvoiceResponse';
import { ReturnItemResponse } from '../../../models/response/ReturnItemResponse';
import { ReturnResponse } from '../../../models/response/ReturnResponse';
import { InvoiceSearchDto } from '../../../models/search/InvoiceSearchDto';
import { AuthService } from '../../../core/services/auth.service';
import { InvoiceApiService } from '../../../services/InvoiceApiService';
import { ReturnApiService } from '../../../services/ReturnApiService';

interface ReturnLine {
  invoiceItemId: string;
  itemId: string;
  itemName: string;
  itemCode?: string;
  invoiceQty: number;
  alreadyReturnedQty: number;
  availableQty: number;
  unitPrice: number;
  discountAmount: number;
  vatAmount: number;
  taxAmount: number;
  lineTotal: number;
  returnQty: number;
  qtyInput: string;
}

@Component({
  selector: 'app-sales-return',
  standalone: false,
  templateUrl: './sales-return.component.html',
  styleUrl: './sales-return.component.scss',
})
export class SalesReturnComponent implements OnInit {
  readonly returnForm: FormGroup;
  readonly invoiceTypeahead$ = new Subject<string>();
  readonly onDecimalKeydown = onDecimalKeydown;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  invoiceOptions: InvoiceResponse[] = [];
  invoice: InvoiceResponse | null = null;
  lines: ReturnLine[] = [];

  loadingInvoices = false;
  loadingInvoice = false;
  loadingRecord = false;
  submitting = false;
  submitted = false;
  confirmOpen = false;
  canCreate = false;
  canUpdate = false;
  isEdit = false;
  returnId = '';
  returnNcId = '';
  restockingFee = 0;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly invoiceApi: InvoiceApiService,
    private readonly returnApi: ReturnApiService,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.canCreate = this.authService.can('ROLE_RETURN_CREATE');
    this.canUpdate = this.authService.can('ROLE_RETURN_UPDATE');
    this.returnForm = this.formBuilder.group({
      invoiceId: [null as string | null, Validators.required],
      returnDate: [new Date(), Validators.required],
    });
    this.setupInvoiceTypeahead();
  }

  ngOnInit(): void {
    this.returnId = this.route.snapshot.paramMap.get('id') || '';
    this.isEdit = !!this.returnId;
    if (!this.isEdit) {
      return;
    }
    if (!this.canUpdate) {
      this.toastr.error('You do not have permission to edit sales returns');
      void this.router.navigate(['/sales/sales-return/list']);
      return;
    }
    this.returnForm.get('invoiceId')?.disable({ emitEvent: false });
    this.loadReturn();
  }

  get f() {
    return this.returnForm.controls;
  }

  get canSave(): boolean {
    return this.isEdit ? this.canUpdate : this.canCreate;
  }

  get selectedReturnQty(): number {
    return this.lines.reduce((sum, line) => sum + toNumber(line.returnQty), 0);
  }

  get returnTotals() {
    return this.lines.reduce(
      (totals, line) => {
        const returned = this.lineReturn(line);
        totals.subTotal += returned.gross;
        totals.discountAmount += returned.discount;
        totals.vatAmount += returned.vat;
        totals.taxAmount += returned.tax;
        totals.refundAmount += returned.lineTotal;
        return totals;
      },
      { subTotal: 0, discountAmount: 0, vatAmount: 0, taxAmount: 0, refundAmount: 0 },
    );
  }

  get confirmMessage(): string {
    const action = this.isEdit ? 'Update' : 'Return';
    return `${action} ${formatToBdNumberingSystem(this.selectedReturnQty, 2)} item qty and refund ${formatToBdNumberingSystem(this.returnTotals.refundAmount, 2)}?`;
  }

  get confirmDetail(): string {
    const invoiceNo = this.invoice?.invoiceNcId || 'this invoice';
    return `Discount, VAT, and tax will be adjusted on ${invoiceNo}. Return qty must be greater than zero and cannot exceed remaining qty.`;
  }

  invoiceLabel(invoice: InvoiceResponse): string {
    const ncId = invoice.invoiceNcId || invoice.id || '';
    const customer = invoice.customerName || 'Walk-in';
    return `${ncId} · ${customer}`;
  }

  statusLabel(status?: string | null): string {
    return invoiceStatusLabel(status);
  }

  displayDate(value?: string | null): string {
    return toDisplayDate(value) || '—';
  }

  remainingQty(line: ReturnLine): number {
    return roundMoney(Math.max(0, line.availableQty - toNumber(line.returnQty)));
  }

  onInvoiceChange(selected: string | InvoiceResponse | null): void {
    if (this.isEdit) {
      return;
    }
    const invoiceId = typeof selected === 'string' ? selected : selected?.id ?? null;
    this.returnForm.patchValue({ invoiceId });
    if (!invoiceId) {
      this.clearInvoice();
      return;
    }
    this.loadInvoice(invoiceId);
  }

  onReturnQtyChange(index: number, value: number | string | null): void {
    const line = this.lines[index];
    if (!line) {
      return;
    }
    const sanitized = sanitizeDecimalInput(String(value ?? ''));
    if (sanitized === '' || sanitized === '.') {
      line.qtyInput = sanitized;
      line.returnQty = 0;
      return;
    }

    const qty = toNumber(sanitized);
    if (qty <= 0 && !sanitized.endsWith('.')) {
      line.qtyInput = '';
      line.returnQty = 0;
      return;
    }

    const capped = Math.min(qty, line.availableQty);
    line.returnQty = capped <= 0 ? 0 : capped;
    if (capped !== qty && qty > 0) {
      line.qtyInput = String(capped);
      return;
    }
    line.qtyInput = sanitized;
  }

  onSubmit(): void {
    if (!this.canSave) {
      return;
    }
    this.submitted = true;
    if (this.returnForm.invalid || !this.invoice?.id) {
      this.toastr.warning('Select an invoice and return date.');
      return;
    }
    const returnItems = this.buildReturnItems();
    if (returnItems.length === 0) {
      this.toastr.warning('Enter a return quantity for at least one item.');
      return;
    }
    const invalid = this.lines.find(
      (line) => line.returnQty > 0 && line.returnQty > line.availableQty,
    );
    if (invalid) {
      this.toastr.warning('Return quantity cannot exceed remaining quantity.');
      return;
    }
    this.confirmOpen = true;
  }

  confirmReturn(): void {
    if (!this.canSave || !this.invoice?.id || !this.invoice.storeId) {
      this.confirmOpen = false;
      return;
    }
    const paymentDate = toApiDate(this.returnForm.getRawValue().returnDate);
    if (!paymentDate) {
      this.toastr.warning('Return date is required.');
      return;
    }

    this.submitting = true;
    const request = new ReturnDto({
      returnDate: paymentDate,
      returnType: 'SALES_RETURN',
      storeId: this.invoice.storeId,
      customerId: this.invoice.customerId,
      invoiceId: this.invoice.id,
      restockingFee: this.restockingFee,
      returnItems: this.buildReturnItems(),
    });

    const save$ = this.isEdit
      ? this.returnApi.updateReturn(this.returnId, request)
      : this.returnApi.createForSales(request);

    save$.pipe(finalize(() => (this.submitting = false))).subscribe({
      next: (result) => {
        this.confirmOpen = false;
        if (this.isEdit) {
          this.toastr.success(
            `Sales return ${result.returnNcId || ''} updated. Invoice totals were updated.`,
          );
          void this.router.navigate(['/sales/sales-return/list']);
          return;
        }
        this.toastr.success(
          `Sales return ${result.returnNcId || ''} saved. Invoice totals were updated.`,
        );
        this.reloadSelectedInvoice();
      },
    });
  }

  cancelReturn(): void {
    if (this.submitting) {
      return;
    }
    this.confirmOpen = false;
  }

  onClear(): void {
    if (this.isEdit) {
      void this.router.navigate(['/sales/sales-return/list']);
      return;
    }
    this.returnForm.reset({
      invoiceId: null,
      returnDate: new Date(),
    });
    this.invoiceOptions = [];
    this.clearInvoice();
    this.submitted = false;
  }

  private loadReturn(): void {
    this.loadingRecord = true;
    this.returnApi
      .getReturnById(this.returnId)
      .pipe(finalize(() => (this.loadingRecord = false)))
      .subscribe({
        next: (record) => this.patchReturn(record),
        error: () => {
          void this.router.navigate(['/sales/sales-return/list']);
        },
      });
  }

  private patchReturn(record: ReturnResponse): void {
    if (record.returnType && record.returnType !== 'SALES_RETURN') {
      this.toastr.error('This return is not a sales return');
      void this.router.navigate(['/sales/sales-return/list']);
      return;
    }
    if (!record.invoiceId) {
      this.toastr.error('Sales return is missing an invoice');
      void this.router.navigate(['/sales/sales-return/list']);
      return;
    }

    this.returnNcId = record.returnNcId || '';
    this.restockingFee = toNumber(record.restockingFee);
    this.returnForm.patchValue({
      invoiceId: record.invoiceId,
      returnDate: toDatePickerValue(record.returnDate) ?? new Date(),
    });
    this.loadInvoice(record.invoiceId, record.returnItems ?? []);
  }

  private setupInvoiceTypeahead(): void {
    this.invoiceTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchInvoices(term)),
      )
      .subscribe((invoices) => {
        this.invoiceOptions = this.mergeInvoiceOptions(invoices);
      });
  }

  private searchInvoices(term: string) {
    const searchTerm = term?.trim();
    if (!searchTerm || searchTerm.length < 3) {
      return of(this.selectedInvoiceOptions());
    }

    this.loadingInvoices = true;
    return this.invoiceApi
      .searchTerm(
        new InvoiceSearchDto({
          searchTerm,
          type: 'SALES',
          invoiceStatusList: ['POSTED', 'PARTIALLY_PAID', 'PAID'],
        }),
      )
      .pipe(
        map((invoices) => invoices ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingInvoices = false)),
      );
  }

  private loadInvoice(invoiceId: string, previousItems: ReturnItemResponse[] = []): void {
    this.loadingInvoice = true;
    this.invoiceApi
      .getInvoiceById(invoiceId)
      .pipe(finalize(() => (this.loadingInvoice = false)))
      .subscribe({
        next: (invoice) => {
          if (invoice.type && invoice.type !== 'SALES') {
            this.toastr.warning('Select a sales invoice.');
            this.clearInvoice();
            return;
          }
          this.invoice = invoice;
          this.invoiceOptions = this.mergeInvoiceOptions([invoice]);
          this.lines = (invoice.items ?? [])
            .filter((item) => item.id && item.itemId)
            .map((item) => this.toLine(item));
          this.mergePreviousReturnItems(previousItems);
          if (this.lines.length === 0) {
            this.toastr.warning('This invoice has no items to return.');
          }
        },
        error: () => this.clearInvoice(),
      });
  }

  private mergePreviousReturnItems(previousItems: ReturnItemResponse[]): void {
    if (!previousItems.length) {
      return;
    }

    const previousQty = new Map<string, ReturnItemResponse>();
    for (const item of previousItems) {
      if (item.invoiceItemId) {
        previousQty.set(item.invoiceItemId, item);
      }
    }

    for (const line of this.lines) {
      const previous = previousQty.get(line.invoiceItemId);
      if (!previous) {
        continue;
      }
      const qty = toNumber(previous.quantity);
      line.availableQty = roundMoney(line.availableQty + qty);
      line.invoiceQty = line.availableQty;
      line.alreadyReturnedQty = qty;
      line.returnQty = qty;
      line.qtyInput = String(qty);
      previousQty.delete(line.invoiceItemId);
    }

    for (const leftover of previousQty.values()) {
      if (!leftover.invoiceItemId || !leftover.itemId) {
        continue;
      }
      const qty = toNumber(leftover.quantity);
      this.lines.push({
        invoiceItemId: leftover.invoiceItemId,
        itemId: leftover.itemId,
        itemName: leftover.itemName || 'Item',
        invoiceQty: qty,
        alreadyReturnedQty: qty,
        availableQty: qty,
        unitPrice: toNumber(leftover.unitPrice),
        discountAmount: toNumber(leftover.discountAmount),
        vatAmount: toNumber(leftover.vatAmount),
        taxAmount: toNumber(leftover.taxAmount),
        lineTotal: toNumber(leftover.lineTotal),
        returnQty: qty,
        qtyInput: String(qty),
      });
    }
  }

  private reloadSelectedInvoice(): void {
    const invoiceId = this.invoice?.id;
    this.lines = [];
    if (invoiceId) {
      this.loadInvoice(invoiceId);
    } else {
      this.clearInvoice();
    }
  }

  private clearInvoice(): void {
    this.invoice = null;
    this.lines = [];
  }

  private toLine(item: InvoiceItemResponse): ReturnLine {
    const remaining = toNumber(item.quantity);
    return {
      invoiceItemId: item.id as string,
      itemId: item.itemId as string,
      itemName: item.itemName || 'Item',
      itemCode: item.itemCode,
      invoiceQty: remaining,
      alreadyReturnedQty: 0,
      availableQty: remaining,
      unitPrice: toNumber(item.unitPrice),
      discountAmount: toNumber(item.discountAmount),
      vatAmount: toNumber(item.vatAmount),
      taxAmount: toNumber(item.taxAmount),
      lineTotal: toNumber(item.lineTotal),
      returnQty: 0,
      qtyInput: '',
    };
  }

  private lineReturn(line: ReturnLine) {
    const returnQty = Math.min(toNumber(line.returnQty), line.availableQty);
    const gross = roundMoney(line.unitPrice * returnQty);
    const discount = this.proportion(line.discountAmount, returnQty, line.availableQty);
    const vat = this.proportion(line.vatAmount, returnQty, line.availableQty);
    const tax = this.proportion(line.taxAmount, returnQty, line.availableQty);
    return {
      gross,
      discount,
      vat,
      tax,
      lineTotal: roundMoney(Math.max(0, gross - discount + vat + tax)),
    };
  }

  private proportion(amount: number, part: number, whole: number): number {
    if (amount <= 0 || part <= 0 || whole <= 0) {
      return 0;
    }
    if (part >= whole) {
      return roundMoney(amount);
    }
    return roundMoney((amount * part) / whole);
  }

  private buildReturnItems(): ReturnItemDto[] {
    return this.lines
      .filter((line) => line.returnQty > 0)
      .map((line) => {
        const returned = this.lineReturn(line);
        return new ReturnItemDto({
          invoiceItemId: line.invoiceItemId,
          itemId: line.itemId,
          quantity: line.returnQty,
          unitPrice: line.unitPrice,
          discountAmount: returned.discount,
          vatAmount: returned.vat,
          taxAmount: returned.tax,
          lineTotal: returned.lineTotal,
        });
      });
  }

  private selectedInvoiceOptions(): InvoiceResponse[] {
    if (!this.invoice?.id) {
      return [];
    }
    return [this.invoice];
  }

  private mergeInvoiceOptions(incoming: InvoiceResponse[]): InvoiceResponse[] {
    const map = new Map<string, InvoiceResponse>();
    for (const option of [...this.selectedInvoiceOptions(), ...incoming]) {
      if (option.id) {
        map.set(option.id, option);
      }
    }
    return [...map.values()];
  }
}
