import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AppModeResponse {
  mode: 'ONLINE' | 'OFFLINE';
  dbType: 'HANA' | 'SQLSERVER' | 'POSTGRES';
  isOffline: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AppModeService {
  private readonly baseUrl = `${environment.apiUrl}/app-config`;
  private _mode = new BehaviorSubject<AppModeResponse | null>(null);
  
  public mode$ = this._mode.asObservable();

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene el modo de operación actual del backend
   */
  getMode(): Observable<AppModeResponse> {
    return this.http.get<AppModeResponse>(`${this.baseUrl}/mode`).pipe(
      tap((response) => {
        this._mode.next(response);
      })
    );
  }

  /**
   * Verifica si el sistema está en modo OFFLINE
   */
  get isOffline(): boolean {
    return this._mode.value?.isOffline ?? false;
  }

  /**
   * Verifica si el sistema está en modo ONLINE
   */
  get isOnline(): boolean {
    return !this.isOffline;
  }

  /**
   * Obtiene el tipo de base de datos actual
   */
  get dbType(): string {
    return this._mode.value?.dbType ?? 'HANA';
  }
}
