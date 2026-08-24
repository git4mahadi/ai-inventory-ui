import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { StockMainResponse } from '../models/response/StockMainResponse';
import { StockMainSearchDto } from '../models/search/StockMainSearchDto';

@Injectable({
  providedIn: 'root',
})
export class StockApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/stocks`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  searchPage(data: StockMainSearchDto): Observable<Page<StockMainResponse>> {
    return this.http
      .post<ApiResponse<Page<StockMainResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search stock');
          return throwError(() => err);
        }),
      );
  }
}
