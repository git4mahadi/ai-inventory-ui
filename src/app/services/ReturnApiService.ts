import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { ReturnDto } from '../models/dto/ReturnDto';
import { ReturnResponse } from '../models/response/ReturnResponse';

@Injectable({
  providedIn: 'root',
})
export class ReturnApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/returns`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createForSales(data: ReturnDto): Observable<ReturnResponse> {
    return this.http
      .post<ApiResponse<ReturnResponse>>(`${this.baseUrl}/sales`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to save sales return');
          return throwError(() => err);
        }),
      );
  }
}
