import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeLookup, unwrapApiData } from '../core/utils/api-response.util';
import { LookupDto } from '../models/dto/LookupDto';
import { LookupResponse } from '../models/response/LookupResponse';
import { LookupSearchDto } from '../models/search/LookupSearchDto';

@Injectable({
  providedIn: 'root',
})
export class LookupApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/lookups`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createLookup(data: LookupDto): Observable<LookupResponse> {
    return this.http.post<ApiResponse<LookupResponse>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      map((result) => this.requireLookup(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to create lookup');
        return throwError(() => err);
      }),
    );
  }

  updateLookup(id: string, data: LookupDto): Observable<LookupResponse> {
    return this.http.put<ApiResponse<LookupResponse>>(`${this.baseUrl}/${id}`, data).pipe(
      unwrapApiData(),
      map((result) => this.requireLookup(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to update lookup');
        return throwError(() => err);
      }),
    );
  }

  deleteLookup(id: string): Observable<LookupResponse | null> {
    return this.http.delete<ApiResponse<LookupResponse | null>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to delete lookup');
        return throwError(() => err);
      }),
    );
  }

  getLookupById(id: string): Observable<LookupResponse> {
    return this.http.get<ApiResponse<LookupResponse>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      map((result) => this.requireLookup(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load lookup');
        return throwError(() => err);
      }),
    );
  }

  getLookupListByEnumKey(lookupEnumKey: string): Observable<LookupResponse[]> {
    return this.http
      .get<ApiResponse<LookupResponse[]>>(`${this.baseUrl}/lookup-enum/${lookupEnumKey}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load lookups');
          return throwError(() => err);
        }),
      );
  }

  getLookupListByKeys(keys: string[]): Observable<Record<string, LookupResponse[]>> {
    return this.http
      .post<ApiResponse<Record<string, LookupResponse[]>>>(`${this.baseUrl}/lookup-enum-keys`, keys)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load lookups');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: LookupSearchDto): Observable<Page<LookupResponse>> {
    return this.http
      .post<ApiResponse<Page<LookupResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search lookups');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: LookupSearchDto): Observable<LookupResponse[]> {
    return this.http.post<ApiResponse<LookupResponse[]>>(`${this.baseUrl}/search-list`, data).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load lookups');
        return throwError(() => err);
      }),
    );
  }

  searchTerm(data: LookupSearchDto): Observable<LookupResponse[]> {
    return this.http.post<ApiResponse<LookupResponse[]>>(`${this.baseUrl}/search-term`, data).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to search lookups');
        return throwError(() => err);
      }),
    );
  }

  private requireLookup(result: unknown): LookupResponse {
    const lookup = normalizeLookup(result);
    if (!lookup) {
      throw { error: { message: 'Invalid lookup response' } };
    }
    return lookup;
  }
}
