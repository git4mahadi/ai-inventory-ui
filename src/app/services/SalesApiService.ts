import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeSales, unwrapApiData } from '../core/utils/api-response.util';
import { SalesDto } from '../models/dto/SalesDto';
import { SalesResponse } from '../models/response/SalesResponse';
import { SalesSearchDto } from '../models/search/SalesSearchDto';

@Injectable({
  providedIn: 'root',
})
export class SalesApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/sales`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createSales(data: SalesDto): Observable<SalesResponse> {
    return this.http.post<ApiResponse<SalesResponse>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      map((result) => this.requireSales(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to create sale');
        return throwError(() => err);
      }),
    );
  }

  updateSales(id: string, data: SalesDto): Observable<SalesResponse> {
    return this.http
      .put<ApiResponse<SalesResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireSales(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update sale');
          return throwError(() => err);
        }),
      );
  }

  deleteSales(id: string): Observable<SalesResponse | null> {
    return this.http
      .delete<ApiResponse<SalesResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete sale');
          return throwError(() => err);
        }),
      );
  }

  getSalesById(id: string): Observable<SalesResponse> {
    return this.http
      .post<ApiResponse<SalesResponse[]>>(
        `${this.baseUrl}/search-list`,
        new SalesSearchDto({ id }),
      )
      .pipe(
        unwrapApiData(),
        map((result) => {
          const record = Array.isArray(result) ? result[0] : undefined;
          const sales = normalizeSales(record);
          if (!sales) {
            throw { error: { message: 'Sale not found' } };
          }
          return sales;
        }),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load sale');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: SalesSearchDto): Observable<Page<SalesResponse>> {
    return this.http
      .post<ApiResponse<Page<SalesResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search sales');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: SalesSearchDto): Observable<SalesResponse[]> {
    return this.http
      .post<ApiResponse<SalesResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load sales');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: SalesSearchDto): Observable<SalesResponse[]> {
    return this.http
      .post<ApiResponse<SalesResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search sales');
          return throwError(() => err);
        }),
      );
  }

  private requireSales(result: unknown): SalesResponse {
    const sales = normalizeSales(result);
    if (!sales) {
      throw { error: { message: 'Invalid sales response' } };
    }
    return sales;
  }
}
