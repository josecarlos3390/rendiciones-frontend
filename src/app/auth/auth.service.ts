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
  sub:        number;
  username:   string;
  name:       string;
  role:       'ADMIN' | 'USER';
  appRend:    string;
  appConf:    string;
  fijarSaldo: string;   // '1' = debe ingresar monto obligatorio, '0' = opcional
  fijarNr:    string;   // '1' = normas preconfiguradas fijas
  nr1:        string;   // norma reparto 1 preconfigurada
  nr2:        string;   // norma reparto 2 preconfigurada
  nr3:        string;   // norma reparto 3 preconfigurada
  genDocPre?: string;   // '1'=puede generar preliminar
  nomSup?:     string;   // login del aprobador (vacío = nivel final)
  esAprobador?: boolean;  // true si algún usuario tiene este login como aprobador
  exp:        number;
  iat:        number;
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


  get fijarSaldo():     boolean { return this.user?.fijarSaldo === '1'; }
  get fijarNr():        boolean { return this.user?.fijarNr === '1'; }
  get nr1():            string  { return this.user?.nr1 ?? ''; }
  get nr2():            string  { return this.user?.nr2 ?? ''; }
  get nr3():            string  { return this.user?.nr3 ?? ''; }
  /** Login del aprobador inmediato — vacío = sin aprobador */
  get nomSup():         string  { return this.user?.nomSup ?? ''; }
  /** true si puede generar documentos preliminares */
  get puedeGenerarPre(): boolean { return this.user?.genDocPre === '1'; }

  // ── Clasificación de roles de negocio ────────────────────────────────
  //
  //  TIPO 1 — USER sin appRend:
  //    NO ve ningún módulo de rendiciones
  //
  //  TIPO 2 — USER con appRend, con aprobador, NO es aprobador de nadie:
  //    Ve: solo "Nueva Rendición"
  //    Ve solo sus propias rendiciones en cualquier estado
  //
  //  TIPO 3 — USER con appRend, ES aprobador de alguien:
  //    Ve: "Nueva Rendición" + "Aprobaciones"
  //    Ve sus propias rendiciones + las que le llegan a él para aprobar
  //    Puede editar y aprobar/rechazar rendiciones de sus subordinados directos
  //
  //  TIPO 4 — USER con appRend, SIN aprobador (nivel final/sync):
  //    Ve: "Nueva Rendición" + "Aprobaciones" + "Integración ERP"
  //    Ve todas las rendiciones de su jerarquía en cascada
  //    Puede sincronizar si además tiene genDocPre habilitado
  //
  //  ADMIN — mismo comportamiento que TIPO 4 pero además puede configurar la app

  /** true si el usuario no tiene aprobador configurado (es nivel final) */
  get sinAprobador(): boolean {
    return !this.user?.nomSup?.trim();
  }

  /** true si este usuario es aprobador de algún otro usuario */
  get esAprobador(): boolean {
    return this.user?.esAprobador === true;
  }

  /** Puede ver el módulo de Rendiciones (requiere appRend habilitado) */
  get canAccessRend(): boolean {
    return this.isAdmin || this.user?.appRend === 'Y';
  }

  /** Puede ver Aprobaciones — aprobadores y usuarios nivel final */
  get canAccessAprobaciones(): boolean {
    if (this.isAdmin) return true;
    if (!this.canAccessRend) return false;
    return this.sinAprobador || this.esAprobador;
  }

  /** Puede ver Integración ERP — solo usuarios sin aprobador (nivel final) */
  get canAccessIntegracion(): boolean {
    if (this.isAdmin) return true;
    if (!this.canAccessRend) return false;
    return this.sinAprobador;
  }

  /**
   * Puede ejecutar sincronización con SAP.
   * Requiere: sin aprobador (nivel final) + genDocPre habilitado.
   */
  get puedeSync(): boolean {
    return this.isAdmin || (this.sinAprobador && this.puedeGenerarPre);
  }

  /**
   * En la tab de subordinados, debe ver en cascada (toda la jerarquía).
   * Solo aplica a usuarios sin aprobador y ADMIN.
   */
  get verSubordinadosEnCascada(): boolean {
    return this.isAdmin || this.sinAprobador;
  }

  /** Puede VER el módulo de Administración — cualquier ADMIN */
  get canAccessConf(): boolean {
    return this.isAdmin;
  }

  /** Puede MODIFICAR configuraciones (crear/editar/eliminar) — ADMIN con appConf = 'Y' */
  get puedeEditarConf(): boolean {
    return this.isAdmin && this.user?.appConf === 'Y';
  }
}