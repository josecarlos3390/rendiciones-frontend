import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  access_token: string;
  user: any;
}

/** Estructura esperada del payload del JWT emitido por el backend */
interface JwtPayload {
  sub:      number;
  username: string;
  name:     string;
  role:     'ADMIN' | 'USER';
  appRend:  string;
  appConf:  string;
  exp:      number;
  iat:      number;
}

/** Valida que el payload tenga los campos mínimos requeridos */
function isValidPayload(p: any): p is JwtPayload {
  return (
    p !== null &&
    typeof p === 'object' &&
    typeof p.sub      === 'number' &&
    typeof p.role     === 'string' &&
    typeof p.exp      === 'number' &&
    (p.role === 'ADMIN' || p.role === 'USER')
  );
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api        = environment.apiUrl;
  private http       = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private storage = {
    get: (key: string): string | null =>
      this.isBrowser ? localStorage.getItem(key) : null,
    set: (key: string, value: string): void => {
      if (this.isBrowser) localStorage.setItem(key, value);
    },
    remove: (key: string): void => {
      if (this.isBrowser) localStorage.removeItem(key);
    },
  };

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api}/auth/login`, { username, password })
      .pipe(
        tap((res) => {
          this.storage.set('token', res.access_token);
          this._cachedUser = null;
        })
      );
  }

  refreshToken(): Observable<void> {
    return this.http
      .post<{ access_token: string }>(`${this.api}/auth/refresh-token`, {})
      .pipe(
        tap((res) => {
          this.storage.set('token', res.access_token);
          this._cachedUser = null;
        }),
      ) as unknown as Observable<void>;
  }

  logout() {
    this.storage.remove('token');
    this._cachedUser = null;
  }

  isLoggedIn(): boolean {
    const payload = this.user;
    if (!payload) return false;
    // exp es obligatorio — si no está presente el token no es válido
    if (Date.now() / 1000 > payload.exp) {
      this.logout();
      return false;
    }
    return true;
  }

  getToken(): string | null {
    return this.storage.get('token');
  }

  private _cachedUser: JwtPayload | null = null;

  get user(): JwtPayload | null {
    if (this._cachedUser) return this._cachedUser;
    const token = this.storage.get('token');
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Formato JWT invalido');
      const payload = JSON.parse(atob(parts[1]));
      if (!isValidPayload(payload)) throw new Error('Payload JWT invalido');
      this._cachedUser = payload;
      return payload;
    } catch {
      this.logout();
      return null;
    }
  }

  get role(): 'ADMIN' | 'USER' | null {
    return this.user?.role ?? null;
  }

  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  get canAccessRend(): boolean { return this.user?.appRend === 'Y'; }
  get canAccessConf(): boolean { return this.isAdmin || this.user?.appConf === 'Y'; }
}