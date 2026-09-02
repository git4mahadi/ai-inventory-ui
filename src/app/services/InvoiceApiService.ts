import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { InvoiceDueCollectionDto } from '../models/dto/InvoiceDueCollectionDto';
import { InvoicePaymentResponse } from '../models/response/InvoicePaymentResponse';
import { InvoiceResponse } from '../models/response/InvoiceResponse';
import { InvoiceSearchDto } from '../models/search/InvoiceSearchDto';

@Injectable({
  providedIn: 'root',
})
export class InvoiceApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/invoices`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  searchPage(data: InvoiceSearchDto): Observable<Page<InvoiceResponse>> {
    return this.http
      .post<ApiResponse<Page<InvoiceResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search invoices');
          return throwError(() => err);
        }),
      );
  }

  collectDue(data: InvoiceDueCollectionDto): Observable<InvoicePaymentResponse> {
    return this.http
      .post<ApiResponse<InvoicePaymentResponse>>(`${this.baseUrl}/due-collections`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to collect due');
          return throwError(() => err);
        }),
      );
  }

  getInvoiceById(id: string): Observable<InvoiceResponse> {
    return this.http.get<ApiResponse<InvoiceResponse>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load invoice');
        return throwError(() => err);
      }),
    );
  }

  searchTerm(data: InvoiceSearchDto): Observable<InvoiceResponse[]> {
    return this.http
      .post<ApiResponse<InvoiceResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search invoices');
          return throwError(() => err);
        }),
      );
  }
}
