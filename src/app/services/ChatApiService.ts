import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Page } from '../core/models/Page';
import { ApiResponse } from '../core/models/Response';
import { unwrapApiData } from '../core/utils/api-response.util';
import { ChatPromptRequest } from '../models/request/ChatPromptRequest';
import { ChatPromptResponse } from '../models/response/ChatPromptResponse';
import { ChatResponse } from '../models/response/ChatResponse';
import { ChatSearchDto } from '../models/search/ChatSearchDto';

@Injectable({
  providedIn: 'root',
})
export class ChatApiService {
  private readonly baseUrl = `${environment.appUrl}/api/v1/chat`;

  constructor(
    private readonly http: HttpClient,
    private readonly toast: ToastrService,
  ) {}

  sendMessage(sessionId: string, message: string): Observable<ChatPromptResponse> {
    return this.http
      .post<ChatPromptResponse | ApiResponse<ChatPromptResponse>>(
        this.baseUrl,
        new ChatPromptRequest({ message }),
        { headers: { sessionId } },
      )
      .pipe(
        map((result) => this.requirePrompt(result)),
        catchError((err: { error?: { message?: string; content?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to send chat message');
          return throwError(() => err);
        }),
      );
  }

  searchPage(data: ChatSearchDto): Observable<Page<ChatResponse>> {
    return this.http
      .post<ApiResponse<Page<ChatResponse>>>(`${this.baseUrl}/search-page`, data)
      .pipe(
        unwrapApiData(),
        catchError((err: { error?: { message?: string } }) => {
          this.toast.error(err?.error?.message || 'Failed to load chat history');
          return throwError(() => err);
        }),
      );
  }

  private requirePrompt(payload: unknown): ChatPromptResponse {
    if (!payload || typeof payload !== 'object') {
      throw { error: { message: 'Invalid chat response' } };
    }
    const value = payload as Record<string, unknown>;
    if ('content' in value || 'timestamp' in value) {
      return value as ChatPromptResponse;
    }
    const nested = value['data'];
    if (nested && typeof nested === 'object' && typeof (nested as ChatPromptResponse).content === 'string') {
      return nested as ChatPromptResponse;
    }
    throw { error: { message: 'Invalid chat response' } };
  }
}
