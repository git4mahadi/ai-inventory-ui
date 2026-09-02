import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { LookupDto } from '../../../models/dto/LookupDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
import { LookupSearchDto } from '../../../models/search/LookupSearchDto';
import { LookupApiService } from '../../../services/LookupApiService';

@Component({
  selector: 'app-lookup-create',
  standalone: false,
  templateUrl: './lookup-create.component.html',
  styleUrl: './lookup-create.component.scss',
})
export class LookupCreateComponent implements OnInit, OnDestroy {
  readonly lookupForm: FormGroup;
  readonly lookupTypes = LookupEnum.enums;
  readonly parentTypeahead$ = new Subject<string>();
  parentOptions: LookupResponse[] = [];
  loadingParents = false;
  submitted = false;
  loading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly lookupApi: LookupApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.lookupForm = this.formBuilder.group({
      lookupEnumKey: [null as string | null, Validators.required],
      lookupName: ['', [Validators.required, Validators.maxLength(120)]],
      lookupShortName: ['', [Validators.maxLength(20)]],
      image: ['', [Validators.maxLength(255)]],
      parentId: [null as string | null],
      enabled: [true],
    });
  }

  get f() {
    return this.lookupForm.controls;
  }

  ngOnInit(): void {
    this.setupParentTypeahead();

    this.lookupForm
      .get('lookupEnumKey')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.lookupForm.patchValue({ parentId: null }, { emitEvent: false });
        this.parentOptions = [];
      });
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

  onSubmit(): void {
    this.submitted = true;
    if (this.lookupForm.invalid || this.loading) {
      return;
    }

    const value = this.lookupForm.value;
    const dto = new LookupDto({
      lookupEnumKey: value.lookupEnumKey,
      lookupName: value.lookupName?.trim(),
      lookupShortName: value.lookupShortName?.trim() || undefined,
      image: value.image?.trim() || undefined,
      parentId: value.parentId || undefined,
      enabled: !!value.enabled,
    });

    this.loading = true;
    this.lookupApi
      .createLookup(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Lookup created successfully');
          void this.router.navigate(['/lookups/list']);
        },
      });
  }

  onClear(): void {
    this.lookupForm.reset({
      lookupEnumKey: null,
      lookupName: '',
      lookupShortName: '',
      image: '',
      parentId: null,
      enabled: true,
    });
    this.parentOptions = [];
    this.submitted = false;
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
        map((lookups) => lookups ?? []),
        catchError(() => of([])),
        finalize(() => (this.loadingParents = false)),
      );
  }
}
