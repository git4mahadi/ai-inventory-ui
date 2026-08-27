import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizePurchaseOrder,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { PurchaseOrderDto } from '../models/dto/PurchaseOrderDto';
import { PurchaseOrderResponse } from '../models/response/PurchaseOrderResponse';
import { PurchaseOrderSearchDto } from '../models/search/PurchaseOrderSearchDto';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/purchase-orders`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createPurchaseOrder(data: PurchaseOrderDto): Observable<PurchaseOrderResponse> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requirePurchaseOrder(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to create purchase order',
          );
          return throwError(() => err);
        }),
      );
  }

  updatePurchaseOrder(
    id: string,
    data: PurchaseOrderDto,
  ): Observable<PurchaseOrderResponse> {
    return this.http
      .put<ApiResponse<PurchaseOrderResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requirePurchaseOrder(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to update purchase order',
          );
          return throwError(() => err);
        }),
      );
  }

  deletePurchaseOrder(id: string): Observable<PurchaseOrderResponse | null> {
    return this.http
      .delete<ApiResponse<PurchaseOrderResponse | null>>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to delete purchase order',
          );
          return throwError(() => err);
        }),
      );
  }

  getPurchaseOrderById(id: string): Observable<PurchaseOrderResponse> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse[]>>(
        `${this.baseUrl}/search-list`,
        new PurchaseOrderSearchDto({ id }),
      )
      .pipe(
        unwrapApiData(),
        map((result) => {
          const record = Array.isArray(result) ? result[0] : undefined;
          const purchaseOrder = normalizePurchaseOrder(record);
          if (!purchaseOrder) {
            throw { error: { message: 'Purchase order not found' } };
          }
          return purchaseOrder;
        }),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load purchase order',
          );
          return throwError(() => err);
        }),
      );
  }

  searchPage(
    data: PurchaseOrderSearchDto,
  ): Observable<Page<PurchaseOrderResponse>> {
    return this.http
      .post<ApiResponse<Page<PurchaseOrderResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search purchase orders',
          );
          return throwError(() => err);
        }),
      );
  }

  searchList(
    data: PurchaseOrderSearchDto,
  ): Observable<PurchaseOrderResponse[]> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse[]>>(
        `${this.baseUrl}/search-list`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to load purchase orders',
          );
          return throwError(() => err);
        }),
      );
  }

  searchTerm(
    data: PurchaseOrderSearchDto,
  ): Observable<PurchaseOrderResponse[]> {
    return this.http
      .post<ApiResponse<PurchaseOrderResponse[]>>(
        `${this.baseUrl}/search-term`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(
            err?.error?.message || 'Failed to search purchase orders',
          );
          return throwError(() => err);
        }),
      );
  }

  private requirePurchaseOrder(result: unknown): PurchaseOrderResponse {
    const purchaseOrder = normalizePurchaseOrder(result);
    if (!purchaseOrder) {
      throw { error: { message: 'Invalid purchase order response' } };
    }
    return purchaseOrder;
  }
}
