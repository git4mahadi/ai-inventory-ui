import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeReturn, unwrapApiData } from '../core/utils/api-response.util';
import { ReturnDto } from '../models/dto/ReturnDto';
import { ReturnResponse } from '../models/response/ReturnResponse';
import { ReturnSearchDto } from '../models/search/ReturnSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ReturnApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/returns`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createForSales(data: ReturnDto): Observable<ReturnResponse> {
    return this.http.post<ApiResponse<ReturnResponse>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      map((result) => this.requireReturn(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to save sales return');
        return throwError(() => err);
      }),
    );
  }

  updateReturn(id: string, data: ReturnDto): Observable<ReturnResponse> {
    return this.http
      .put<ApiResponse<ReturnResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReturn(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update sales return');
          return throwError(() => err);
        }),
      );
  }

  deleteReturn(id: string): Observable<ReturnResponse | null> {
    return this.http
      .delete<ApiResponse<ReturnResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete sales return');
          return throwError(() => err);
        }),
      );
  }

  getReturnById(id: string): Observable<ReturnResponse> {
    return this.http.get<ApiResponse<ReturnResponse>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      map((result) => this.requireReturn(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load sales return');
        return throwError(() => err);
      }),
    );
  }

  searchPage(data: ReturnSearchDto): Observable<Page<ReturnResponse>> {
    return this.http
      .post<ApiResponse<Page<ReturnResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search sales returns');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: ReturnSearchDto): Observable<ReturnResponse[]> {
    return this.http
      .post<ApiResponse<ReturnResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load sales returns');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: ReturnSearchDto): Observable<ReturnResponse[]> {
    return this.http
      .post<ApiResponse<ReturnResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search sales returns');
          return throwError(() => err);
        }),
      );
  }

  private requireReturn(result: unknown): ReturnResponse {
    const record = normalizeReturn(result);
    if (!record) {
      throw { error: { message: 'Invalid sales return response' } };
    }
    return record;
  }
}
