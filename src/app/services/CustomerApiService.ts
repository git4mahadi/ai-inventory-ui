import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import {
  normalizeCustomer,
  unwrapApiData,
} from '../core/utils/api-response.util';
import { CustomerDto } from '../models/dto/CustomerDto';
import { CustomerResponse } from '../models/response/CustomerResponse';
import { CustomerSearchDto } from '../models/search/CustomerSearchDto';

@Injectable({
  providedIn: 'root',
})
export class CustomerApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/customers`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createCustomer(data: CustomerDto): Observable<CustomerResponse> {
    return this.http
      .post<ApiResponse<CustomerResponse>>(this.baseUrl, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireCustomer(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to create customer');
          return throwError(() => err);
        }),
      );
  }

  updateCustomer(id: string, data: CustomerDto): Observable<CustomerResponse> {
    return this.http
      .put<ApiResponse<CustomerResponse>>(`${this.baseUrl}/${id}`, data)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireCustomer(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to update customer');
          return throwError(() => err);
        }),
      );
  }

  deleteCustomer(id: string): Observable<CustomerResponse | null> {
    return this.http
      .delete<ApiResponse<CustomerResponse | null>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to delete customer');
          return throwError(() => err);
        }),
      );
  }

  getCustomerById(id: string): Observable<CustomerResponse> {
    return this.http
      .get<ApiResponse<CustomerResponse>>(`${this.baseUrl}/${id}`)
      .pipe(
        unwrapApiData(),
        map((result) => this.requireCustomer(result)),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load customer');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: CustomerSearchDto): Observable<Page<CustomerResponse>> {
    return this.http
      .post<ApiResponse<Page<CustomerResponse>>>(
        `${this.baseUrl}/search-page`,
        data,
      )
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search customers');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: CustomerSearchDto): Observable<CustomerResponse[]> {
    return this.http
      .post<ApiResponse<CustomerResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load customers');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: CustomerSearchDto): Observable<CustomerResponse[]> {
    return this.http
      .post<ApiResponse<CustomerResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search customers');
          return throwError(() => err);
        }),
      );
  }

  private requireCustomer(result: unknown): CustomerResponse {
    const customer = normalizeCustomer(result);
    if (!customer) {
      throw { error: { message: 'Invalid customer response' } };
    }
    return customer;
  }
}
