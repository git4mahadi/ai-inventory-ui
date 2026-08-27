import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeReceive, unwrapApiData } from '../core/utils/api-response.util';
import { ReceiveDto } from '../models/dto/ReceiveDto';
import { ReceiveResponse } from '../models/response/ReceiveResponse';
import { ReceiveSearchDto } from '../models/search/ReceiveSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ReceiveApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/receives`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createReceive(data: ReceiveDto): Observable<ReceiveResponse> {
    return this.http
      .post<ApiResponse<ReceiveResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReceive(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create receive');
          return throwError(() => err);
        }),
      );
  }

  updateReceive(id: string, data: ReceiveDto): Observable<ReceiveResponse> {
    return this.http
      .put<ApiResponse<ReceiveResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReceive(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update receive');
          return throwError(() => err);
        }),
      );
  }

  deleteReceive(id: string): Observable<ReceiveResponse | null> {
    return this.http
      .delete<ApiResponse<ReceiveResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete receive');
          return throwError(() => err);
        }),
      );
  }

  getReceiveById(id: string): Observable<ReceiveResponse> {
    return this.http
      .get<ApiResponse<ReceiveResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireReceive(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load receive');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: ReceiveSearchDto): Observable<Page<ReceiveResponse>> {
    return this.http
      .post<ApiResponse<Page<ReceiveResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search receives');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: ReceiveSearchDto): Observable<ReceiveResponse[]> {
    return this.http
      .post<ApiResponse<ReceiveResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load receives');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: ReceiveSearchDto): Observable<ReceiveResponse[]> {
    return this.http
      .post<ApiResponse<ReceiveResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search receives');
          return throwError(() => err);
        }),
      );
  }

  private requireReceive(result: unknown): ReceiveResponse {
    const receive = normalizeReceive(result);
    if (!receive) {
      throw { error: { message: 'Invalid receive response' } };
    }
    return receive;
  }
}
