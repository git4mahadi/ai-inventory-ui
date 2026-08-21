import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { AuthRequest } from '../models/request/AuthRequest';
import { AuthResponse } from '../models/response/AuthResponse';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  authenticate(data: AuthRequest): Observable<AuthResponse> {
    const url = `${environment.appUrl}/api/v1/auth/login`;
    return this.http.post<ApiResponse<AuthResponse>>(url, data).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Authentication failed');
        return throwError(() => err);
      }),
    );
  }
}
