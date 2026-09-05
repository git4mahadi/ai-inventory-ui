import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AuthRequest } from '../../models/request/AuthRequest';
import { AuthResponse } from '../../models/response/AuthResponse';
import { AuthApiService } from '../../services/AuthApiService';
import { AccessContext } from '../security/menu-access';

export interface AuthUser {
  username: string;
  name: string;
  email?: string;
  authority?: string;
  roles: string[];
}

interface StoredAuthSession {
  token: string;
  user: AuthUser;
}

interface JwtPayload {
  sub?: string;
  fullName?: string;
  authority?: unknown;
  roles?: unknown;
  exp?: number;
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

  getAccessContext(): AccessContext {
    const payload = this.token ? this.parseJwtPayload(this.token) : null;
    const authority = this.normalizeAuthority(payload?.authority);
    const roles = new Set(this.normalizeRoles(payload?.roles));
    return {
      isAdmin: authority === 'ADMIN' || authority === 'SUPER_ADMIN',
      authority,
      roles,
    };
  }

  isAdmin(): boolean {
    return this.getAccessContext().isAdmin;
  }

  can(role: string): boolean {
    return this.canAccess(false, [role]);
  }

  hasRole(role: string): boolean {
    return this.getAccessContext().roles.has(role);
  }

  hasAnyRole(roles: readonly string[]): boolean {
    if (!roles.length) {
      return true;
    }
    const assigned = this.getAccessContext().roles;
    return roles.some((role) => assigned.has(role));
  }

  canAccess(requireAdmin?: boolean, roles?: readonly string[]): boolean {
    if (requireAdmin) {
      return this.isAdmin();
    }
    if (this.isAdmin()) {
      return true;
    }
    if (!roles?.length) {
      return true;
    }
    return this.hasAnyRole(roles);
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
    const payload = this.parseJwtPayload(token);
    if (!payload) {
      return 0;
    }
    if (typeof payload.exp !== 'number') {
      return null;
    }
    return payload.exp * 1000 - Date.now();
  }

  private parseJwtPayload(token: string): JwtPayload | null {
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }
      return JSON.parse(this.decodeBase64Url(payloadPart)) as JwtPayload;
    } catch {
      return null;
    }
  }

  private decodeBase64Url(value: string): string {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + '='.repeat(padLength));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  private userFromToken(token: string, fallback?: Partial<AuthUser>): AuthUser {
    const payload = this.parseJwtPayload(token);
    const username = payload?.sub || fallback?.username || 'user';
    return {
      username,
      name: (typeof payload?.fullName === 'string' && payload.fullName) || fallback?.name || username,
      email: fallback?.email,
      authority: this.normalizeAuthority(payload?.authority),
      roles: this.normalizeRoles(payload?.roles),
    };
  }

  private normalizeAuthority(raw: unknown): string | undefined {
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    if (raw && typeof raw === 'object') {
      const record = raw as Record<string, unknown>;
      if (typeof record['name'] === 'string' && record['name'].trim()) {
        return record['name'].trim();
      }
    }
    return undefined;
  }

  private normalizeRoles(raw: unknown): string[] {
    let value: unknown = raw;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }
      try {
        value = JSON.parse(trimmed);
      } catch {
        return [trimmed];
      }
    }
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((role): role is string => typeof role === 'string' && !!role);
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
    const user = this.userFromToken(response.token, {
      username,
      name: response.name || username,
      email: response.email,
    });

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
      return {
        token: parsed.token,
        user: this.userFromToken(parsed.token, parsed.user),
      };
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
