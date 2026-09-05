import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeUser, unwrapApiData } from '../core/utils/api-response.util';
import { UserDto } from '../models/dto/UserDto';
import { UserResponse } from '../models/response/UserResponse';
import { UserSearchDto } from '../models/search/UserSearchDto';

@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/users`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createUser(data: UserDto): Observable<UserResponse> {
    return this.http.post<ApiResponse<UserResponse>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      map((result) => this.requireUser(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to create user');
        return throwError(() => err);
      }),
    );
  }

  updateUser(id: string, data: UserDto): Observable<UserResponse> {
    const params = new HttpParams().set('id', id);
    return this.http
      .put<ApiResponse<UserResponse>>(this.baseUrl, data, { params })
      .pipe(
        unwrapApiData(),
        map((result) => this.requireUser(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update user');
          return throwError(() => err);
        }),
      );
  }

  deleteUser(id: string): Observable<UserResponse | null> {
    return this.http
      .delete<ApiResponse<UserResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete user');
          return throwError(() => err);
        }),
      );
  }

  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      map((result) => this.requireUser(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load user');
        return throwError(() => err);
      }),
    );
  }

  searchPage(data: UserSearchDto): Observable<Page<UserResponse>> {
    return this.http
      .post<ApiResponse<Page<UserResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search users');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: UserSearchDto): Observable<UserResponse[]> {
    return this.http
      .post<ApiResponse<UserResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load users');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: UserSearchDto): Observable<UserResponse[]> {
    return this.http
      .post<ApiResponse<UserResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search users');
          return throwError(() => err);
        }),
      );
  }

  private requireUser(result: unknown): UserResponse {
    const user = normalizeUser(result);
    if (!user) {
      throw { error: { message: 'Invalid user response' } };
    }
    return user;
  }
}
