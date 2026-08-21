import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeFinancialYear,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { FinancialYearDto } from '../models/dto/FinancialYearDto';
import { FinancialYearResponse } from '../models/response/FinancialYearResponse';
import { FinancialYearSearchDto } from '../models/search/FinancialYearSearchDto';

@Injectable({
  providedIn: 'root',
})
export class FinancialYearApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/financial-years`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createFinancialYear(
    data: FinancialYearDto,
  ): Observable<FinancialYearResponse> {
    return this.http
      .post<ApiResponse<FinancialYearResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireFinancialYear(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to create financial year',
          );
          return throwError(() => err);
        }),
      );
  }

  updateFinancialYear(
    id: string,
    data: FinancialYearDto,
  ): Observable<FinancialYearResponse> {
    return this.http
      .put<ApiResponse<FinancialYearResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireFinancialYear(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to update financial year',
          );
          return throwError(() => err);
        }),
      );
  }

  deleteFinancialYear(id: string): Observable<FinancialYearResponse | null> {
    return this.http
      .delete<ApiResponse<FinancialYearResponse | null>>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to delete financial year',
          );
          return throwError(() => err);
        }),
      );
  }

  getFinancialYearById(id: string): Observable<FinancialYearResponse> {
    return this.http
      .get<ApiResponse<FinancialYearResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireFinancialYear(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load financial year',
          );
          return throwError(() => err);
        }),
      );
  }

  searchPage(
    data: FinancialYearSearchDto,
  ): Observable<Page<FinancialYearResponse>> {
    return this.http
      .post<ApiResponse<Page<FinancialYearResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search financial years',
          );
          return throwError(() => err);
        }),
      );
  }

  searchList(
    data: FinancialYearSearchDto,
  ): Observable<FinancialYearResponse[]> {
    return this.http
      .post<ApiResponse<FinancialYearResponse[]>>(
        `${this.baseUrl}/search-list`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load financial years',
          );
          return throwError(() => err);
        }),
      );
  }

  searchTerm(
    data: FinancialYearSearchDto,
  ): Observable<FinancialYearResponse[]> {
    return this.http
      .post<ApiResponse<FinancialYearResponse[]>>(
        `${this.baseUrl}/search-term`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search financial years',
          );
          return throwError(() => err);
        }),
      );
  }

  private requireFinancialYear(result: unknown): FinancialYearResponse {
    const financialYear = normalizeFinancialYear(result);
    if (!financialYear) {
      throw { error: { message: 'Invalid financial year response' } };
    }
    return financialYear;
  }
}
