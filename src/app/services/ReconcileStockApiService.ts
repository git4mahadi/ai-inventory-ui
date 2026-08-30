import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeReconcileStock,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { ReconcileStockDto } from '../models/dto/ReconcileStockDto';
import { ReconcileStockResponse } from '../models/response/ReconcileStockResponse';
import { ReconcileStockSearchDto } from '../models/search/ReconcileStockSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ReconcileStockApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/reconcile-stocks`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createReconcileStock(data: ReconcileStockDto): Observable<ReconcileStockResponse> {
    return this.http
      .post<ApiResponse<ReconcileStockResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReconcileStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  updateReconcileStock(
    id: string,
    data: ReconcileStockDto,
  ): Observable<ReconcileStockResponse> {
    return this.http
      .put<ApiResponse<ReconcileStockResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReconcileStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  deleteReconcileStock(id: string): Observable<ReconcileStockResponse | null> {
    return this.http
      .delete<ApiResponse<ReconcileStockResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  getReconcileStockById(id: string): Observable<ReconcileStockResponse> {
    return this.http
      .get<ApiResponse<ReconcileStockResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReconcileStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: ReconcileStockSearchDto): Observable<Page<ReconcileStockResponse>> {
    return this.http
      .post<ApiResponse<Page<ReconcileStockResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: ReconcileStockSearchDto): Observable<ReconcileStockResponse[]> {
    return this.http
      .post<ApiResponse<ReconcileStockResponse[]>>(
        `${this.baseUrl}/search-list`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: ReconcileStockSearchDto): Observable<ReconcileStockResponse[]> {
    return this.http
      .post<ApiResponse<ReconcileStockResponse[]>>(
        `${this.baseUrl}/search-term`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search stock reconcile');
          return throwError(() => err);
        }),
      );
  }

  private requireReconcileStock(result: unknown): ReconcileStockResponse {
    const record = normalizeReconcileStock(result);
    if (!record) {
      throw { error: { message: 'Invalid stock reconcile response' } };
    }
    return record;
  }
}
