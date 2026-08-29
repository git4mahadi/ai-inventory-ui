import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeItem,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { ItemDto } from '../models/dto/ItemDto';
import { ItemResponse } from '../models/response/ItemResponse';
import { ItemSearchDto } from '../models/search/ItemSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ItemApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/items`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createItem(data: ItemDto): Observable<ItemResponse> {
    return this.http
      .post<ApiResponse<ItemResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireItem(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create item');
          return throwError(() => err);
        }),
      );
  }

  updateItem(id: string, data: ItemDto): Observable<ItemResponse> {
    return this.http
      .put<ApiResponse<ItemResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireItem(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update item');
          return throwError(() => err);
        }),
      );
  }

  deleteItem(id: string): Observable<ItemResponse | null> {
    return this.http
      .delete<ApiResponse<ItemResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete item');
          return throwError(() => err);
        }),
      );
  }

  getItemById(id: string): Observable<ItemResponse> {
    return this.searchList(new ItemSearchDto({ id })).pipe(
      map((items) => {
        const item = items?.[0];
        if (!item) {
          throw { error: { message: 'Item not found' } };
        }
        return item;
      }),
      catchError((err: { error?: { message?: string } }) => {
        if (!err?.error?.message) {
          this.toast.error('Failed to load item');
        }
        return throwError(() => err);
      }),
    );
  }

  searchPage(data: ItemSearchDto): Observable<Page<ItemResponse>> {
    return this.http
      .post<ApiResponse<Page<ItemResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search items');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: ItemSearchDto): Observable<ItemResponse[]> {
    return this.http
      .post<ApiResponse<ItemResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load items');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: ItemSearchDto): Observable<ItemResponse[]> {
    return this.http
      .post<ApiResponse<ItemResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search items');
          return throwError(() => err);
        }),
      );
  }

  searchTermWithStock(data: ItemSearchDto): Observable<ItemResponse[]> {
    return this.http
      .post<ApiResponse<ItemResponse[]>>(
        `${this.baseUrl}/search-term-with-stock`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search items with stock',
          );
          return throwError(() => err);
        }),
      );
  }

  private requireItem(result: unknown): ItemResponse {
    const item = normalizeItem(result);
    if (!item) {
      throw { error: { message: 'Invalid item response' } };
    }
    return item;
  }
}
