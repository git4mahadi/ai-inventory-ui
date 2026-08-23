import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeOpeningStock,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { OpeningStockDto } from '../models/dto/OpeningStockDto';
import { OpeningStockResponse } from '../models/response/OpeningStockResponse';
import { OpeningStockSearchDto } from '../models/search/OpeningStockSearchDto';

@Injectable({
  providedIn: 'root',
})
export class OpeningStockApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/opening-stocks`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createOpeningStock(data: OpeningStockDto): Observable<OpeningStockResponse> {
    return this.http
      .post<ApiResponse<OpeningStockResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireOpeningStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to create opening stock',
          );
          return throwError(() => err);
        }),
      );
  }

  updateOpeningStock(
    id: string,
    data: OpeningStockDto,
  ): Observable<OpeningStockResponse> {
    return this.http
      .put<ApiResponse<OpeningStockResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireOpeningStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to update opening stock',
          );
          return throwError(() => err);
        }),
      );
  }

  deleteOpeningStock(id: string): Observable<OpeningStockResponse | null> {
    return this.http
      .delete<ApiResponse<OpeningStockResponse | null>>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to delete opening stock',
          );
          return throwError(() => err);
        }),
      );
  }

  getOpeningStockById(id: string): Observable<OpeningStockResponse> {
    return this.http
      .get<ApiResponse<OpeningStockResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireOpeningStock(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load opening stock',
          );
          return throwError(() => err);
        }),
      );
  }

  searchPage(
    data: OpeningStockSearchDto,
  ): Observable<Page<OpeningStockResponse>> {
    return this.http
      .post<ApiResponse<Page<OpeningStockResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search opening stocks',
          );
          return throwError(() => err);
        }),
      );
  }

  searchList(
    data: OpeningStockSearchDto,
  ): Observable<OpeningStockResponse[]> {
    return this.http
      .post<ApiResponse<OpeningStockResponse[]>>(
        `${this.baseUrl}/search-list`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load opening stocks',
          );
          return throwError(() => err);
        }),
      );
  }

  searchTerm(
    data: OpeningStockSearchDto,
  ): Observable<OpeningStockResponse[]> {
    return this.http
      .post<ApiResponse<OpeningStockResponse[]>>(
        `${this.baseUrl}/search-term`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search opening stocks',
          );
          return throwError(() => err);
        }),
      );
  }

  private requireOpeningStock(result: unknown): OpeningStockResponse {
    const openingStock = normalizeOpeningStock(result);
    if (!openingStock) {
      throw { error: { message: 'Invalid opening stock response' } };
    }
    return openingStock;
  }
}
