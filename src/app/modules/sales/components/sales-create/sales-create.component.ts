import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SalesService } from '../../services/sales.service';

@Component({
  selector: 'app-sales-create',
  standalone: false,
  templateUrl: './sales-create.component.html',
  styleUrl: './sales-create.component.scss',
})
export class SalesCreateComponent {
  readonly saleForm: FormGroup;
  submitted = false;
  successMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly salesService: SalesService,
    private readonly router: Router,
  ) {
    this.saleForm = this.formBuilder.group({
      itemName: ['', [Validators.required, Validators.maxLength(100)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0.01)]],
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      notes: ['', [Validators.maxLength(250)]],
    });
  }

  get f() {
    return this.saleForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';

    if (this.saleForm.invalid) {
      return;
    }

    this.salesService.addSale(this.saleForm.value);
    this.successMessage = 'Sale recorded successfully.';
    this.saleForm.reset({ quantity: 1, unitPrice: 0 });
    this.submitted = false;

    setTimeout(() => {
      void this.router.navigate(['/sales/list']);
    }, 600);
  }
}
