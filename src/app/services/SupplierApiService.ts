import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeSupplier,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { SupplierDto } from '../models/dto/SupplierDto';
import { SupplierResponse } from '../models/response/SupplierResponse';
import { SupplierSearchDto } from '../models/search/SupplierSearchDto';

@Injectable({
  providedIn: 'root',
})
export class SupplierApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/suppliers`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createSupplier(data: SupplierDto): Observable<SupplierResponse> {
    return this.http
      .post<ApiResponse<SupplierResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireSupplier(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create supplier');
          return throwError(() => err);
        }),
      );
  }

  updateSupplier(id: string, data: SupplierDto): Observable<SupplierResponse> {
    return this.http
      .put<ApiResponse<SupplierResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireSupplier(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update supplier');
          return throwError(() => err);
        }),
      );
  }

  deleteSupplier(id: string): Observable<SupplierResponse | null> {
    return this.http
      .delete<ApiResponse<SupplierResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete supplier');
          return throwError(() => err);
        }),
      );
  }

  getSupplierById(id: string): Observable<SupplierResponse> {
    return this.http
      .get<ApiResponse<SupplierResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireSupplier(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load supplier');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: SupplierSearchDto): Observable<Page<SupplierResponse>> {
    return this.http
      .post<ApiResponse<Page<SupplierResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search suppliers');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: SupplierSearchDto): Observable<SupplierResponse[]> {
    return this.http
      .post<ApiResponse<SupplierResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load suppliers');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: SupplierSearchDto): Observable<SupplierResponse[]> {
    return this.http
      .post<ApiResponse<SupplierResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search suppliers');
          return throwError(() => err);
        }),
      );
  }

  private requireSupplier(result: unknown): SupplierResponse {
    const supplier = normalizeSupplier(result);
    if (!supplier) {
      throw { error: { message: 'Invalid supplier response' } };
    }
    return supplier;
  }
}
