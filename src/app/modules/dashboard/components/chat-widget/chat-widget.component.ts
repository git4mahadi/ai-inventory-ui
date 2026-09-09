import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { normalizePage } from '../../../../core/utils/api-response.util';
import { ChatResponse } from '../../../../models/response/ChatResponse';
import { ChatSearchDto } from '../../../../models/search/ChatSearchDto';
import { ChatApiService } from '../../../../services/ChatApiService';

interface ChatBubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

@Component({
  selector: 'app-chat-widget',
  standalone: false,
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
})
export class ChatWidgetComponent implements OnDestroy {
  @ViewChild('thread') thread?: ElementRef<HTMLDivElement>;
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;

  open = false;
  draft = '';
  sending = false;
  loadingHistory = false;
  loadingMore = false;
  hasMore = false;
  historyError = false;
  messages: ChatBubble[] = [];

  private sessionId = '';
  private historyPage = 0;
  readonly historySize = 20;
  private historyLoaded = false;
  private shouldStickToBottom = true;
  private localSeq = 0;

  constructor(
    private readonly chatApi: ChatApiService,
    private readonly authService: AuthService,
  ) {
    this.sessionId = this.readOrCreateSessionId();
  }

  ngOnDestroy(): void {
    this.open = false;
  }

  toggleOpen(): void {
    this.open = !this.open;
    if (!this.open) {
      return;
    }
    if (!this.historyLoaded) {
      this.loadHistory(true);
    } else {
      this.queueScrollToBottom();
    }
    setTimeout(() => this.composer?.nativeElement.focus(), 60);
  }

  startNewChat(): void {
    this.sessionId = this.createSessionId();
    this.persistSessionId(this.sessionId);
    this.messages = [];
    this.historyPage = 0;
    this.hasMore = false;
    this.historyLoaded = true;
    this.historyError = false;
    this.draft = '';
    setTimeout(() => this.composer?.nativeElement.focus(), 60);
  }

  onThreadScroll(): void {
    const el = this.thread?.nativeElement;
    if (!el) {
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.shouldStickToBottom = distanceFromBottom < 48;
    if (el.scrollTop < 36 && this.hasMore && !this.loadingMore && !this.loadingHistory) {
      this.loadHistory(false);
    }
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.send();
  }

  send(): void {
    const message = this.draft.trim();
    if (!message || this.sending) {
      return;
    }

    this.draft = '';
    this.messages = [
      ...this.messages,
      {
        id: this.nextLocalId('user'),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      },
    ];
    this.shouldStickToBottom = true;
    this.queueScrollToBottom();
    this.sending = true;

    this.chatApi
      .sendMessage(this.sessionId, message)
      .pipe(finalize(() => (this.sending = false)))
      .subscribe({
        next: (reply) => {
          const content = String(reply.content || '').trim();
          this.messages = [
            ...this.messages,
            {
              id: this.nextLocalId('assistant'),
              role: 'assistant',
              content: content || 'I could not generate a reply. Please try again.',
              timestamp: reply.timestamp,
            },
          ];
          this.shouldStickToBottom = true;
          this.queueScrollToBottom();
        },
      });
  }

  private loadHistory(reset: boolean): void {
    const page = reset ? 0 : this.historyPage + 1;
    const thread = this.thread?.nativeElement;
    const previousHeight = thread?.scrollHeight ?? 0;

    if (reset) {
      this.loadingHistory = true;
      this.historyError = false;
    } else {
      this.loadingMore = true;
    }

    this.chatApi
      .searchPage(
        new ChatSearchDto({
          sessionId: this.sessionId,
          page,
          size: this.historySize,
        }),
      )
      .pipe(
        finalize(() => {
          this.loadingHistory = false;
          this.loadingMore = false;
          this.historyLoaded = true;
        }),
      )
      .subscribe({
        next: (result) => {
          const pageResult = normalizePage<ChatResponse>(result);
          const older = [...(pageResult.content ?? [])]
            .reverse()
            .map((row) => this.toBubble(row))
            .filter((row) => row.content);
          this.historyPage = pageResult.number ?? page;
          this.hasMore = pageResult.last === false;
          this.messages = reset ? older : [...older, ...this.messages];
          if (reset) {
            this.shouldStickToBottom = true;
            this.queueScrollToBottom();
          } else {
            this.restoreScroll(previousHeight);
          }
        },
        error: () => {
          if (reset) {
            this.historyError = true;
            this.messages = [];
          }
        },
      });
  }

  private toBubble(row: ChatResponse): ChatBubble {
    const type = String(row.type || '').toUpperCase();
    return {
      id: row.id || this.nextLocalId(type === 'USER' ? 'user' : 'assistant'),
      role: type === 'USER' ? 'user' : 'assistant',
      content: String(row.content || '').trim(),
      timestamp: row.timestamp,
    };
  }

  private queueScrollToBottom(): void {
    setTimeout(() => {
      const el = this.thread?.nativeElement;
      if (!el || !this.shouldStickToBottom) {
        return;
      }
      el.scrollTop = el.scrollHeight;
    });
  }

  private restoreScroll(previousHeight: number): void {
    setTimeout(() => {
      const el = this.thread?.nativeElement;
      if (!el) {
        return;
      }
      el.scrollTop = el.scrollHeight - previousHeight;
    });
  }

  private readOrCreateSessionId(): string {
    const key = this.storageKey();
    try {
      const existing = localStorage.getItem(key);
      if (existing) {
        return existing;
      }
    } catch {
      // Ignore storage access issues and create a fresh session.
    }
    const created = this.createSessionId();
    this.persistSessionId(created);
    return created;
  }

  private persistSessionId(sessionId: string): void {
    try {
      localStorage.setItem(this.storageKey(), sessionId);
    } catch {
      // Chat still works for this page load without persistence.
    }
  }

  private storageKey(): string {
    const username = this.authService.getCurrentUser()?.username || 'user';
    return `ai-inventory.chat.sessionId.${username}`;
  }

  private createSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private nextLocalId(prefix: string): string {
    this.localSeq += 1;
    return `${prefix}-${Date.now()}-${this.localSeq}`;
  }
}
