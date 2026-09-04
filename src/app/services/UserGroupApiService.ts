import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizePage,
  normalizeUserGroup,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { UserGroupDto } from '../models/dto/UserGroupDto';
import { UserGroupResponse } from '../models/response/UserGroupResponse';
import { UserGroupSearchDto } from '../models/search/UserGroupSearchDto';

@Injectable({
  providedIn: 'root',
})
export class UserGroupApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/user-groups`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createUserGroup(data: UserGroupDto): Observable<UserGroupResponse> {
    return this.http.post<ApiResponse<UserGroupResponse>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      map((result) => this.requireUserGroup(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to create user group');
        return throwError(() => err);
      }),
    );
  }

  updateUserGroup(id: string, data: UserGroupDto): Observable<UserGroupResponse> {
    return this.http
      .put<ApiResponse<UserGroupResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireUserGroup(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update user group');
          return throwError(() => err);
        }),
      );
  }

  deleteUserGroup(id: string): Observable<UserGroupResponse | null> {
    return this.http
      .delete<ApiResponse<UserGroupResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete user group');
          return throwError(() => err);
        }),
      );
  }

  getUserGroupById(id: string): Observable<UserGroupResponse> {
    return this.searchPage(new UserGroupSearchDto({ id, page: 0, size: 1 })).pipe(
      map((result) => {
        const page = normalizePage<UserGroupResponse>(result);
        const group = normalizeUserGroup(page.content?.[0]);
        if (!group) {
          throw { error: { message: 'User group not found' } };
        }
        return group;
      }),
    );
  }

  searchPage(data: UserGroupSearchDto): Observable<Page<UserGroupResponse>> {
    return this.http
      .post<ApiResponse<Page<UserGroupResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search user groups');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: UserGroupSearchDto): Observable<UserGroupResponse[]> {
    return this.http
      .post<ApiResponse<UserGroupResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load user groups');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: UserGroupSearchDto): Observable<UserGroupResponse[]> {
    return this.http
      .post<ApiResponse<UserGroupResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search user groups');
          return throwError(() => err);
        }),
      );
  }

  private requireUserGroup(result: unknown): UserGroupResponse {
    const group = normalizeUserGroup(result);
    if (!group) {
      throw { error: { message: 'Invalid user group response' } };
    }
    return group;
  }
}
