import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { StoreDto } from '../../../models/dto/StoreDto';
import { StoreApiService } from '../../../services/StoreApiService';

@Component({
  selector: 'app-store-create',
  standalone: false,
  templateUrl: './store-create.component.html',
  styleUrl: './store-create.component.scss',
})
export class StoreCreateComponent {
  readonly storeForm: FormGroup;
  submitted = false;
  loading = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly storeApi: StoreApiService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.storeForm = this.formBuilder.group({
      storeName: ['', [Validators.required, Validators.maxLength(100)]],
      storeCode: ['', [Validators.required, Validators.maxLength(20)]],
      mobile: ['', [Validators.maxLength(20)]],
      address: ['', [Validators.maxLength(250)]],
      isMain: [false],
      enabled: [true],
    });
  }

  get f() {
    return this.storeForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.storeForm.invalid || this.loading) {
      return;
    }

    const dto = new StoreDto({
      storeName: this.storeForm.value.storeName?.trim(),
      storeCode: this.storeForm.value.storeCode?.trim(),
      mobile: this.storeForm.value.mobile?.trim() || undefined,
      address: this.storeForm.value.address?.trim() || undefined,
      isMain: !!this.storeForm.value.isMain,
      enabled: !!this.storeForm.value.enabled,
    });

    this.loading = true;
    this.storeApi
      .createStore(dto)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Store created successfully');
          void this.router.navigate(['/stores/list']);
        },
      });
  }

  onClear(): void {
    this.storeForm.reset({
      storeName: '',
      storeCode: '',
      mobile: '',
      address: '',
      isMain: false,
      enabled: true,
    });
    this.submitted = false;
  }
}
