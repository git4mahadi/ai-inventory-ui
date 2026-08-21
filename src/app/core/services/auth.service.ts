import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
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

  readonly currentUser$: Observable<AuthUser | null> =
    this.currentUserSubject.asObservable();

  constructor(
    private readonly router: Router,
    private readonly authApiService: AuthApiService,
  ) {}

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
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
    localStorage.removeItem(this.storageKey);
    this.token = null;
    this.currentUserSubject.next(null);
    void this.router.navigate(['/auth/login']);
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
