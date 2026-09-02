import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthRequest } from '../../models/request/AuthRequest';
import { AuthResponse } from '../../models/response/AuthResponse';
import { AuthApiService } from '../../services/AuthApiService';

export interface AuthUser {
  username: string;
  name: string;
  email?: string;
}

interface StoredAuthSession {
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'ai-inventory-auth';
  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(
    this.readStoredSession()?.user ?? null,
  );
  private token: string | null = this.readStoredSession()?.token ?? null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private endingSession = false;

  readonly currentUser$: Observable<AuthUser | null> =
    this.currentUserSubject.asObservable();

  constructor(
    private readonly router: Router,
    private readonly authApiService: AuthApiService,
    private readonly toastr: ToastrService,
  ) {
    this.scheduleExpiryWatch();
  }

  isAuthenticated(): boolean {
    if (!this.token) {
      return false;
    }

    if (this.isTokenExpired(this.token)) {
      this.clearSession();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    if (this.token && this.isTokenExpired(this.token)) {
      this.sessionExpired();
      return null;
    }
    return this.token;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  login(request: AuthRequest): Observable<AuthResponse> {
    return this.authApiService.authenticate(request).pipe(
      tap((response) => this.setSession(response, request)),
    );
  }

  logout(): void {
    this.endSession(false);
  }

  sessionExpired(): void {
    this.endSession(true);
  }

  private endSession(expired: boolean): void {
    if (this.endingSession) {
      return;
    }

    const hadSession = !!this.token || !!this.currentUserSubject.value;
    this.endingSession = true;
    this.clearSession();

    if (expired && hadSession) {
      this.toastr.warning('Session expired. Please login again.');
    }

    if (!this.router.url.startsWith('/auth')) {
      void this.router.navigate(['/auth/login']);
    }

    this.endingSession = false;
  }

  private clearSession(): void {
    this.clearExpiryTimer();
    localStorage.removeItem(this.storageKey);
    this.token = null;
    this.currentUserSubject.next(null);
  }

  private isTokenExpired(token: string): boolean {
    const remaining = this.msUntilExpiry(token);
    return remaining !== null && remaining <= 0;
  }

  private msUntilExpiry(token: string): number | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return 0;
      }

      const payload = JSON.parse(this.decodeBase64Url(payloadPart)) as { exp?: number };
      if (typeof payload.exp !== 'number') {
        return null;
      }

      return payload.exp * 1000 - Date.now();
    } catch {
      return 0;
    }
  }

  private decodeBase64Url(value: string): string {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    return atob(padded + '='.repeat(padLength));
  }

  private scheduleExpiryWatch(): void {
    this.clearExpiryTimer();
    if (!this.token) {
      return;
    }

    const remaining = this.msUntilExpiry(this.token);
    if (remaining === null) {
      return;
    }
    if (remaining <= 0) {
      queueMicrotask(() => this.sessionExpired());
      return;
    }

    this.expiryTimer = setTimeout(() => this.sessionExpired(), remaining);
  }

  private clearExpiryTimer(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  private setSession(response: AuthResponse, request: AuthRequest): void {
    if (!response?.token) {
      throw new Error('Authentication response did not include a token.');
    }

    const username = response.username || request.username || 'user';
    const user: AuthUser = {
      username,
      name: response.name || username,
      email: response.email,
    };

    const session: StoredAuthSession = {
      token: response.token,
      user,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.token = response.token;
    this.currentUserSubject.next(user);
    this.scheduleExpiryWatch();
  }

  private readStoredSession(): StoredAuthSession | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as StoredAuthSession;
      if (!parsed?.token || !parsed?.user) {
        localStorage.removeItem(this.storageKey);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
