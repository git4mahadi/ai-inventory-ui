import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthRequest } from '../../../../models/request/AuthRequest';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  readonly loginForm: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {
    this.loginForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  get username() {
    return this.loginForm.get('username');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onFieldFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    input?.removeAttribute('readonly');
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid || this.loading) {
      return;
    }

    const request = new AuthRequest({
      username: this.loginForm.value.username,
      password: this.loginForm.value.password,
    });

    this.loading = true;
    this.authService
      .login(request)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Signed in successfully');
          void this.router.navigate(['/dashboard']);
        },
        error: (err: { error?: { message?: string } }) => {
          this.errorMessage = err?.error?.message || 'Invalid username or password.';
        },
      });
  }
}
