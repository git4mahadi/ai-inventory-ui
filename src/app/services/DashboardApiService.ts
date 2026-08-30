import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../core/models/Response';
import { normalizeSummaryV1, unwrapApiData } from '../core/utils/api-response.util';
import { SummaryResponseV1 } from '../models/response/SummaryResponseV1';
import { DashboardSummarySearchDto } from '../models/search/DashboardSummarySearchDto';

@Injectable({
  providedIn: 'root',
})
export class DashboardApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/dashboards`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  getSummary1(search: DashboardSummarySearchDto): Observable<SummaryResponseV1> {
    let params = new HttpParams();
    if (search.startDate) {
      params = params.set('startDate', search.startDate);
    }
    if (search.endDate) {
      params = params.set('endDate', search.endDate);
    }
    if (search.storeId) {
      params = params.set('storeId', search.storeId);
    }

    return this.http
      .get<ApiResponse<SummaryResponseV1>>(`${this.baseUrl}/summary1`, { params })
      .pipe(
        unwrapApiData(),
        map((result) => this.requireSummary(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load dashboard summary');
          return throwError(() => err);
        }),
      );
  }

  private requireSummary(result: unknown): SummaryResponseV1 {
    const summary = normalizeSummaryV1(result);
    if (!summary) {
      throw { error: { message: 'Invalid dashboard summary response' } };
    }
    return summary;
  }
}
