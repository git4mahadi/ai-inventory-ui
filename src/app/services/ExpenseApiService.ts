import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { normalizeExpense, unwrapApiData } from '../core/utils/api-response.util';
import { ExpenseDto } from '../models/dto/ExpenseDto';
import { ExpenseResponse } from '../models/response/ExpenseResponse';
import { ExpenseSearchDto } from '../models/search/ExpenseSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ExpenseApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/expenses`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  createExpenses(data: ExpenseDto[]): Observable<string | null> {
    return this.http.post<ApiResponse<string>>(this.baseUrl, data).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to create expense');
        return throwError(() => err);
      }),
    );
  }

  updateExpense(id: string, data: ExpenseDto): Observable<ExpenseResponse> {
    return this.http.put<ApiResponse<ExpenseResponse>>(`${this.baseUrl}/${id}`, data).pipe(
      unwrapApiData(),
      map((result) => this.requireExpense(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to update expense');
        return throwError(() => err);
      }),
    );
  }

  deleteExpense(id: string): Observable<ExpenseResponse | null> {
    return this.http.delete<ApiResponse<ExpenseResponse | null>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to delete expense');
        return throwError(() => err);
      }),
    );
  }

  getExpenseById(id: string): Observable<ExpenseResponse> {
    return this.http.get<ApiResponse<ExpenseResponse>>(`${this.baseUrl}/${id}`).pipe(
      unwrapApiData(),
      map((result) => this.requireExpense(result)),
      catchError((err: { error?: { message?: string } }) => {
        this.toast.error(err?.error?.message || 'Failed to load expense');
        return throwError(() => err);
      }),
    );
  }

  searchPage(data: ExpenseSearchDto): Observable<Page<ExpenseResponse>> {
    return this.http
      .post<ApiResponse<Page<ExpenseResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search expenses');
          return throwError(() => err);
        }),
      );
  }

  searchList(data: ExpenseSearchDto): Observable<ExpenseResponse[]> {
    return this.http
      .post<ApiResponse<ExpenseResponse[]>>(`${this.baseUrl}/search-list`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load expenses');
          return throwError(() => err);
        }),
      );
  }

  searchTerm(data: ExpenseSearchDto): Observable<ExpenseResponse[]> {
    return this.http
      .post<ApiResponse<ExpenseResponse[]>>(`${this.baseUrl}/search-term`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to search expenses');
          return throwError(() => err);
        }),
      );
  }

  private requireExpense(result: unknown): ExpenseResponse {
    const expense = normalizeExpense(result);
    if (!expense) {
      throw { error: { message: 'Invalid expense response' } };
    }
    return expense;
  }
}
