import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { SapService } from './sap.service';

export interface AppConfig {
  bolivianosEs: 'LOCAL' | 'SISTEMA';
  appMode:      'ONLINE' | 'OFFLINE';
  dbType:       'HANA' | 'SQLSERVER' | 'POSTGRES';
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http       = inject(HttpClient);
  private sapService = inject(SapService);

  private _config$ = new BehaviorSubject<AppConfig>({
    bolivianosEs: 'LOCAL',
    appMode:      'ONLINE',
    dbType:       'HANA',
  });

  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>(`${environment.apiUrl}/app-config`, {
          headers: { 'X-Skip-Error-Handler': 'true' },
        }),
      );
      config.bolivianosEs = (config.bolivianosEs ?? 'LOCAL').toString().toUpperCase() as 'LOCAL' | 'SISTEMA';
      config.appMode      = (config.appMode      ?? 'ONLINE').toString().toUpperCase() as 'ONLINE' | 'OFFLINE';
      config.dbType       = (config.dbType       ?? 'HANA').toString().toUpperCase()   as 'HANA' | 'SQLSERVER' | 'POSTGRES';
      this._config$.next(config);

      // Solo limpiar caché en memoria — sin llamar al backend
      // (este load() corre antes del login, sin JWT todavía)
      // El backend ya enruta correctamente según APP_MODE en cada petición
      this.sapService.clearCache();

    } catch (e) {
      console.warn('AppConfigService: usando valores por defecto.', e);
    }
  }

  get bolivianosEs(): 'LOCAL' | 'SISTEMA' {
    return this._config$.value.bolivianosEs;
  }

  get appMode(): 'ONLINE' | 'OFFLINE' {
    return this._config$.value.appMode;
  }

  get isOffline(): boolean {
    return this._config$.value.appMode === 'OFFLINE';
  }

  get dbType(): 'HANA' | 'SQLSERVER' | 'POSTGRES' {
    return this._config$.value.dbType;
  }

  get monedaOptions(): { value: string; label: string }[] {
    if (this._config$.value.bolivianosEs === 'SISTEMA') {
      return [
        { value: '0', label: 'Moneda Local (USD)' },
        { value: '1', label: 'Moneda Sistema (BS)' },
      ];
    }
    return [
      { value: '0', label: 'Moneda Local (BS)' },
      { value: '1', label: 'Moneda Sistema (USD)' },
    ];
  }
}