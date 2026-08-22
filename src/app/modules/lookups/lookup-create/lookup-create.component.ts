import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { LookupDto } from '../../../models/dto/LookupDto';
import { LookupEnum } from '../../../models/enums/LookupEnum';
import { LookupResponse } from '../../../models/response/LookupResponse';
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
    });
  }

  get f() {
    return this.lookupForm.controls;
  }

  ngOnInit(): void {
    this.lookupForm
      .get('lookupEnumKey')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((lookupEnumKey) => {
        this.lookupForm.patchValue({ parentId: null }, { emitEvent: false });
        this.loadParentOptions(lookupEnumKey);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  parentLabel(lookup: LookupResponse): string {
    return lookup.parentFullName || lookup.lookupName || lookup.id || '';
  }

  loadParentOptions(lookupEnumKey: string | null): void {
    if (!lookupEnumKey) {
      this.parentOptions = [];
      return;
    }

    this.loadingParents = true;
    this.lookupApi
      .getLookupListByEnumKey(lookupEnumKey)
      .pipe(finalize(() => (this.loadingParents = false)))
      .subscribe({
        next: (lookups) => {
          this.parentOptions = lookups ?? [];
        },
        error: () => {
          this.parentOptions = [];
        },
      });
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
    });
    this.parentOptions = [];
    this.submitted = false;
  }
}
