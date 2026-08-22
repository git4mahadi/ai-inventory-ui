import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { normalizeLookup } from '../../../core/utils/api-response.util';
import { LookupDto } from '../../../models/dto/LookupDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { LookupApiService } from '../../../services/LookupApiService';

@Component({
  selector: 'app-lookup-edit',
  standalone: false,
  templateUrl: './lookup-edit.component.html',
  styleUrl: './lookup-edit.component.scss',
})
export class LookupEditComponent implements OnInit, OnDestroy {
  readonly lookupForm: FormGroup;
  readonly lookupTypes = LookupEnum.enums;
  readonly parentTypeahead$ = new Subject<string>();
  parentOptions: LookupResponse[] = [];
  loadingParents = false;
  submitted = false;
  loading = false;
  loadingLookup = true;
  lookupId = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly lookupApi: LookupApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.lookupForm = this.formBuilder.group({
      lookupEnumKey: [null as string | null, Validators.required],
      lookupName: ['', [Validators.required, Validators.maxLength(120)]],
      lookupShortName: ['', [Validators.maxLength(20)]],
      image: ['', [Validators.maxLength(255)]],
      parentId: [null as string | null],
    });
  }

  get f() {
    return this.lookupForm.controls;
  }

  ngOnInit(): void {
    this.lookupId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.lookupId) {
      this.toastr.error('Lookup id is missing');
      void this.router.navigate(['/lookups/list']);
      return;
    }

    this.setupParentTypeahead();

    this.lookupForm
      .get('lookupEnumKey')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.lookupForm.patchValue({ parentId: null }, { emitEvent: false });
        this.parentOptions = [];
      });

    const stateLookup = normalizeLookup(
      (history.state?.['lookup'] as LookupResponse | undefined) ??
        this.router.lastSuccessfulNavigation()?.extras?.state?.['lookup'],
    );
    if (stateLookup) {
      this.patchForm(stateLookup);
      this.loadingLookup = false;
    }

    this.loadLookup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  parentLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  onParentOpen(): void {
    if (!this.lookupForm.get('lookupEnumKey')?.value) {
      return;
    }
    this.parentTypeahead$.next('');
  }

  onClear(): void {
    this.lookupForm.reset({
      lookupEnumKey: null,
      lookupName: '',
      lookupShortName: '',
      image: '',
      parentId: null,
    });
    this.parentOptions = [];
  }

  loadLookup(): void {
    if (!this.lookupForm.get('lookupName')?.value) {
      this.loadingLookup = true;
    }

    this.lookupApi
      .getLookupById(this.lookupId)
      .pipe(finalize(() => (this.loadingLookup = false)))
      .subscribe({
        next: (lookup) => {
          this.patchForm(lookup);
        },
        error: () => {
          if (!this.lookupForm.get('lookupName')?.value) {
            void this.router.navigate(['/lookups/list']);
          }
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.lookupForm.invalid || this.loading || !this.lookupId) {
      return;
    }

    const value = this.lookupForm.value;
    const dto = new LookupDto({
      lookupEnumKey: value.lookupEnumKey,
      lookupName: value.lookupName?.trim(),
      lookupShortName: value.lookupShortName?.trim() || undefined,
      image: value.image?.trim() || undefined,
      parentId: value.parentId || undefined,
    });

    this.loading = true;
    this.lookupApi
      .updateLookup(this.lookupId, dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Lookup updated successfully');
          void this.router.navigate(['/lookups/list']);
        },
      });
  }

  private setupParentTypeahead(): void {
    this.parentTypeahead$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.searchParents(term)),
        takeUntil(this.destroy$),
      )
      .subscribe((lookups) => {
        this.parentOptions = lookups;
      });
  }

  private searchParents(term: string) {
    const lookupEnumKey = this.lookupForm.get('lookupEnumKey')?.value;
    if (!lookupEnumKey) {
      return of([]);
    }

    this.loadingParents = true;
    return this.lookupApi
      .searchTerm(
        new LookupSearchDto({
          searchTerm: term?.trim() || undefined,
          lookupEnumKey,
          enabled: true,
        }),
      )
      .pipe(
        map((lookups) =>
          (lookups ?? []).filter((lookup) => lookup.id !== this.lookupId),
        ),
        catchError(() => of([])),
        finalize(() => (this.loadingParents = false)),
      );
  }

  private patchForm(lookup: LookupResponse): void {
    const normalized = normalizeLookup(lookup);
    if (!normalized) {
      return;
    }

    this.lookupForm.patchValue(
      {
        lookupEnumKey: normalized.lookupEnumKey ?? null,
        lookupName: normalized.lookupName ?? '',
        lookupShortName: normalized.lookupShortName ?? '',
        image: normalized.image ?? '',
        parentId: normalized.parentId ?? null,
      },
      { emitEvent: false },
    );

    this.ensureSelectedParentOption(normalized.parentId ?? null);
  }

  private ensureSelectedParentOption(parentId: string | null): void {
    if (!parentId || this.parentOptions.some((lookup) => lookup.id === parentId)) {
      return;
    }

    this.lookupApi.getLookupById(parentId).subscribe({
      next: (parent) => {
        if (parent?.id && parent.id !== this.lookupId) {
          this.parentOptions = [parent, ...this.parentOptions];
        }
      },
    });
  }
}
