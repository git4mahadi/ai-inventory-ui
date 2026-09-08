import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap/modal';
import { BsDatepickerConfig } from 'ngx-bootstrap/datepicker';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';
import { normalizeExpense } from '../../../core/utils/api-response.util';
import { toApiDate, toDatePickerValue } from '../../../core/utils/date.util';
import { ExpenseDto } from '../../../models/dto/ExpenseDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { ExpenseResponse } from '../../../models/response/ExpenseResponse';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { StoreResponse } from '../../../models/response/StoreResponse';
import { StoreSearchDto } from '../../../models/search/StoreSearchDto';
import { ExpenseApiService } from '../../../services/ExpenseApiService';
import { LookupApiService } from '../../../services/LookupApiService';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-expense-edit-dialog',
  standalone: false,
  templateUrl: './expense-edit-dialog.component.html',
  styleUrl: './expense-edit-dialog.component.scss',
})
export class ExpenseEditDialogComponent implements OnInit, OnDestroy {
  @Input() expenseId: string | null = null;
  @Input() expense: ExpenseResponse | null = null;
  @Input() canUpdate = false;

  readonly form: FormGroup;
  readonly datePickerConfig: Partial<BsDatepickerConfig> = {
    dateInputFormat: 'DD-MMM-YY',
    containerClass: 'theme-green',
    adaptivePosition: true,
    showWeekNumbers: false,
    customTodayClass: 'bs-datepicker-today',
  };

  expenseHeadOptions: LookupResponse[] = [];
  storeOptions: StoreResponse[] = [];
  submitted = false;
  updating = false;
  loading = false;
  loadingHeads = false;
  loadingStores = false;

  private editingExpense: ExpenseResponse | null = null;
  private bootstrapped = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly expenseApi: ExpenseApiService,
    private readonly lookupApi: LookupApiService,
    private readonly storeApi: StoreApiService,
    private readonly toastr: ToastrService,
    private readonly activeModal: NgbActiveModal,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.formBuilder.group({
      expenseDate: [new Date() as Date | null, Validators.required],
      storeId: [null as string | null, Validators.required],
      expenseHeadId: [null as string | null, Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: ['', [Validators.maxLength(255)]],
      enabled: [true],
    });
  }

  get f() {
    return this.form.controls;
  }

  get editingReady(): boolean {
    return !!this.editingExpense?.id;
  }

  ngOnInit(): void {
    // NgbModal assigns componentInstance inputs after open(); wait one macrotask.
    setTimeout(() => this.bootstrap());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  lookupLabel(lookup: LookupResponse): string {
    return lookup.lookupName || '';
  }

  storeLabel(store: StoreResponse | null | undefined): string {
    if (!store) {
      return '';
    }
    const name = store.storeName?.trim() || '';
    const code = store.storeCode?.trim() || '';
    if (name && code) {
      return `${name} (${code})`;
    }
    return name || code || store.id || '';
  }

  readonly storeSearchFn = (term: string, item: StoreResponse): boolean => {
    const query = term?.trim().toLowerCase();
    if (!query) {
      return true;
    }
    const haystack = `${item.storeName || ''} ${item.storeCode || ''}`.toLowerCase();
    return haystack.includes(query);
  };

  dismiss(): void {
    if (this.updating) {
      return;
    }
    this.activeModal.dismiss();
  }

  onSubmit(): void {
    this.submitted = true;
    const editingId = this.editingExpense?.id || this.expenseId;
    if (this.form.invalid || this.updating || !editingId || !this.canUpdate) {
      return;
    }

    const value = this.form.getRawValue();
    const dto = new ExpenseDto({
      expenseDate: toApiDate(value.expenseDate),
      storeId: value.storeId || undefined,
      expenseHeadId: value.expenseHeadId || undefined,
      amount: Number(value.amount),
      remarks: value.remarks?.trim() || undefined,
      enabled: !!value.enabled,
    });

    this.updating = true;
    this.expenseApi
      .updateExpense(editingId, dto)
      .pipe(finalize(() => (this.updating = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Expense updated successfully');
          this.activeModal.close(true);
        },
      });
  }

  private bootstrap(): void {
    if (this.bootstrapped) {
      return;
    }
    this.bootstrapped = true;

    this.loadStores();
    this.loadExpenseHeads();

    if (this.expense) {
      this.patchForm(this.expense);
    }

    const id = this.expenseId || this.expense?.id || null;
    if (!id) {
      this.toastr.error('Expense not found');
      this.activeModal.dismiss();
      return;
    }

    this.expenseId = id;
    this.loading = true;
    this.expenseApi
      .getExpenseById(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (full) => {
          if (!this.form.dirty) {
            this.patchForm(full);
          }
        },
        error: () => this.activeModal.dismiss(),
      });
  }

  private patchForm(expense: ExpenseResponse): void {
    const normalized = normalizeExpense(expense);
    if (!normalized?.id) {
      return;
    }

    this.editingExpense = normalized;
    this.expenseId = normalized.id;
    this.submitted = false;
    this.form.patchValue({
      expenseDate: toDatePickerValue(normalized.expenseDate),
      storeId: normalized.storeId != null ? String(normalized.storeId) : null,
      expenseHeadId:
        normalized.expenseHeadId != null ? String(normalized.expenseHeadId) : null,
      amount: normalized.amount ?? null,
      remarks: normalized.remarks ?? '',
      enabled: normalized.enabled ?? true,
    });
    this.form.markAsPristine();

    this.ensureStoreOption(
      normalized.storeId != null ? String(normalized.storeId) : null,
      normalized.storeName,
    );
    this.ensureExpenseHeadOption(
      normalized.expenseHeadId != null ? String(normalized.expenseHeadId) : null,
      normalized.expenseHeadName,
    );
    this.cdr.markForCheck();
  }

  private ensureStoreOption(storeId: string | null, storeName?: string): void {
    if (!storeId) {
      return;
    }

    const id = String(storeId);
    if (this.storeOptions.some((store) => String(store.id) === id)) {
      return;
    }

    if (storeName) {
      this.storeOptions = [{ id, storeName }, ...this.storeOptions];
      return;
    }

    this.storeApi
      .getStoreById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (store) => {
          if (store?.id && !this.storeOptions.some((item) => String(item.id) === String(store.id))) {
            this.storeOptions = [{ ...store, id: String(store.id) }, ...this.storeOptions];
            this.cdr.markForCheck();
          }
        },
      });
  }

  private ensureExpenseHeadOption(headId: string | null, headName?: string): void {
    if (!headId || this.expenseHeadOptions.some((lookup) => String(lookup.id) === headId)) {
      return;
    }
    this.expenseHeadOptions = [
      { id: headId, lookupName: headName },
      ...this.expenseHeadOptions,
    ];
  }

  private loadStores(): void {
    this.loadingStores = true;
    this.storeApi
      .searchList(new StoreSearchDto({ enabled: true }))
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingStores = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (stores) => {
          const list = (stores ?? []).map((store) => ({
            ...store,
            id: store.id != null ? String(store.id) : store.id,
          }));
          const selectedId = this.form.get('storeId')?.value as string | null;
          const selected = selectedId
            ? this.storeOptions.find((store) => String(store.id) === selectedId)
            : null;
          this.storeOptions =
            selected && !list.some((store) => store.id === selected.id)
              ? [selected, ...list]
              : list;
          this.cdr.detectChanges();
        },
      });
  }

  private loadExpenseHeads(): void {
    this.loadingHeads = true;
    this.lookupApi
      .getLookupListByEnumKey(LookupEnum.EXPENSE_HEAD.key)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingHeads = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (lookups) => {
          const list = (lookups ?? []).map((lookup) => ({
            ...lookup,
            id: lookup.id != null ? String(lookup.id) : lookup.id,
          }));
          const headId =
            this.editingExpense?.expenseHeadId != null
              ? String(this.editingExpense.expenseHeadId)
              : (this.form.get('expenseHeadId')?.value as string | null);
          if (headId && !list.some((lookup) => lookup.id === headId)) {
            this.expenseHeadOptions = [
              {
                id: headId,
                lookupName: this.editingExpense?.expenseHeadName,
              },
              ...list,
            ];
          } else {
            this.expenseHeadOptions = list;
          }
          this.cdr.detectChanges();
        },
      });
  }
}
