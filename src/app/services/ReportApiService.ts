import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { CurrentExpiredStockReportDto } from '../models/report/CurrentExpiredStockReportDto';
import { IncomeStatementReportDto } from '../models/report/IncomeStatementReportDto';
import { ItemWiseCurrentStockReportDto } from '../models/report/ItemWiseCurrentStockReportDto';

@Injectable({
  providedIn: 'root',
})
export class ReportApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/reports`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  printItemCurrentStock(storeId: string): Observable<ItemWiseCurrentStockReportDto[]> {
    const params = new HttpParams().set('storeId', storeId);
    return this.http
      .get<ApiResponse<ItemWiseCurrentStockReportDto[]>>(
        `${this.baseUrl}/print-item-current-stock`,
        { params },
      )
      .pipe(
        unwrapApiData(),
        map((result) => (Array.isArray(result) ? result : [])),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load current stock report');
          return throwError(() => err);
        }),
      );
  }

  printCurrentExpiredStock(
    storeId: string,
    expireUntil: string,
    itemId?: string | null,
  ): Observable<CurrentExpiredStockReportDto[]> {
    let params = new HttpParams()
      .set('storeId', storeId)
      .set('expireUntil', expireUntil);
    if (itemId) {
      params = params.set('itemId', itemId);
    }
    return this.http
      .get<ApiResponse<CurrentExpiredStockReportDto[]>>(
        `${this.baseUrl}/print-current-expired-stock`,
        { params },
      )
      .pipe(
        unwrapApiData(),
        map((result) => (Array.isArray(result) ? result : [])),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load expired stock report');
          return throwError(() => err);
        }),
      );
  }

  printIncomeStatement(
    storeId: string,
    startDate: string,
    endDate: string,
  ): Observable<IncomeStatementReportDto[]> {
    const params = new HttpParams()
      .set('storeId', storeId)
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http
      .get<ApiResponse<IncomeStatementReportDto[]>>(
        `${this.baseUrl}/print-income-statement`,
        { params },
      )
      .pipe(
        unwrapApiData(),
        map((result) => (Array.isArray(result) ? result : [])),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load income statement');
          return throwError(() => err);
        }),
      );
  }
}
