import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
import { roundMoney, toNumber } from '../../../core/utils/sales-cart.util';
import { toApiDate, toDisplayDate } from '../../../core/utils/date.util';
import { formatToBdNumberingSystem } from '../../../core/utils/bd-number.util';
import { ReturnDto } from '../../../models/dto/ReturnDto';
import { ReturnItemDto } from '../../../models/dto/ReturnItemDto';
import { invoiceStatusLabel } from '../../../models/enums/InvoiceStatus';
import { InvoiceItemResponse } from '../../../models/response/InvoiceItemResponse';
import { InvoiceResponse } from '../../../models/response/InvoiceResponse';
import { InvoiceSearchDto } from '../../../models/search/InvoiceSearchDto';
import { InvoiceApiService } from '../../../services/InvoiceApiService';
import { ReturnApiService } from '../../../services/ReturnApiService';

interface ReturnLine {
  invoiceItemId: string;
  itemId: string;
  itemName: string;
  itemCode?: string;
  invoiceQty: number;
  unitPrice: number;
  discountAmount: number;
  vatAmount: number;
  taxAmount: number;
  lineTotal: number;
  returnQty: number;
}

@Component({
  selector: 'app-sales-return',
  standalone: false,
  templateUrl: './sales-return.component.html',
  styleUrl: './sales-return.component.scss',
})
export class SalesReturnComponent {
  readonly returnForm: FormGroup;
  readonly invoiceTypeahead$ = new Subject<string>();
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
  submitting = false;
  submitted = false;
  confirmOpen = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly invoiceApi: InvoiceApiService,
    private readonly returnApi: ReturnApiService,
    private readonly toastr: ToastrService,
  ) {
    this.returnForm = this.formBuilder.group({
      invoiceId: [null as string | null, Validators.required],
      returnDate: [new Date(), Validators.required],
    });
    this.setupInvoiceTypeahead();
  }

  get f() {
    return this.returnForm.controls;
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
    return `Return ${formatToBdNumberingSystem(this.selectedReturnQty, 2)} item qty and refund ${formatToBdNumberingSystem(this.returnTotals.refundAmount, 2)}?`;
  }

  get confirmDetail(): string {
    const invoiceNo = this.invoice?.invoiceNcId || 'this invoice';
    return `Discount, VAT, and tax will be adjusted on ${invoiceNo}. Return qty cannot exceed invoice qty.`;
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

  onInvoiceChange(selected: string | InvoiceResponse | null): void {
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
    const qty = Math.max(0, toNumber(value));
    line.returnQty = roundMoney(Math.min(qty, line.invoiceQty));
  }

  onSubmit(): void {
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
    const invalid = this.lines.find((line) => line.returnQty > line.invoiceQty);
    if (invalid) {
      this.toastr.warning('Return quantity cannot exceed invoice quantity.');
      return;
    }
    this.confirmOpen = true;
  }

  confirmReturn(): void {
    if (!this.invoice?.id || !this.invoice.storeId) {
      this.confirmOpen = false;
      return;
    }
    const paymentDate = toApiDate(this.returnForm.value.returnDate);
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
      returnItems: this.buildReturnItems(),
    });

    this.returnApi
      .createForSales(request)
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (result) => {
          this.toastr.success(
            `Sales return ${result.returnNcId || ''} saved. Invoice totals were updated.`,
          );
          this.confirmOpen = false;
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
    this.returnForm.reset({
      invoiceId: null,
      returnDate: new Date(),
    });
    this.invoiceOptions = [];
    this.clearInvoice();
    this.submitted = false;
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

  private loadInvoice(invoiceId: string): void {
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
          if (this.lines.length === 0) {
            this.toastr.warning('This invoice has no items to return.');
          }
        },
        error: () => this.clearInvoice(),
      });
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
    return {
      invoiceItemId: item.id as string,
      itemId: item.itemId as string,
      itemName: item.itemName || 'Item',
      itemCode: item.itemCode,
      invoiceQty: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      discountAmount: toNumber(item.discountAmount),
      vatAmount: toNumber(item.vatAmount),
      taxAmount: toNumber(item.taxAmount),
      lineTotal: toNumber(item.lineTotal),
      returnQty: 0,
    };
  }

  private lineReturn(line: ReturnLine) {
    const returnQty = Math.min(toNumber(line.returnQty), line.invoiceQty);
    const gross = roundMoney(line.unitPrice * returnQty);
    const discount = this.proportion(line.discountAmount, returnQty, line.invoiceQty);
    const vat = this.proportion(line.vatAmount, returnQty, line.invoiceQty);
    const tax = this.proportion(line.taxAmount, returnQty, line.invoiceQty);
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
