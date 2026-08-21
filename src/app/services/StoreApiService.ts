import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeStore,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { StoreDto } from '../models/dto/StoreDto';
import { StoreResponse } from '../models/response/StoreResponse';
import { StoreSearchDto } from '../models/search/StoreSearchDto';

@Injectable({
  providedIn: 'root',
})
export class StoreApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/stores`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createStore(data: StoreDto): Observable<StoreResponse> {
    return this.http
      .post<ApiResponse<StoreResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireStore(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create store');
          return throwError(() => err);
        }),
      );
  }

  updateStore(id: string, data: StoreDto): Observable<StoreResponse> {
    return this.http
      .put<ApiResponse<StoreResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireStore(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update store');
          return throwError(() => err);
        }),
      );
  }

  deleteStore(id: string): Observable<StoreResponse | null> {
    return this.http
      .delete<ApiResponse<StoreResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete store');
          return throwError(() => err);
        }),
      );
  }

  getStoreById(id: string): Observable<StoreResponse> {
    return this.http
      .get<ApiResponse<StoreResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireStore(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load store');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: StoreSearchDto): Observable<Page<StoreResponse>> {
    return this.http
      .post<ApiResponse<Page<StoreResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search stores');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: StoreSearchDto): Observable<StoreResponse[]> {
    return this.http
      .post<ApiResponse<StoreResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load stores');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: StoreSearchDto): Observable<StoreResponse[]> {
    return this.http
      .post<ApiResponse<StoreResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search stores');
          return throwError(() => err);
        }),
      );
  }

  private requireStore(result: unknown): StoreResponse {
    const store = normalizeStore(result);
    if (!store) {
      throw { error: { message: 'Invalid store response' } };
    }
    return store;
  }
}
