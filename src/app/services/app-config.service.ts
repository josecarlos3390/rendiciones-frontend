import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppConfig {
  bolivianosEs: 'LOCAL' | 'SISTEMA';
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private http = inject(HttpClient);
  private _config$ = new BehaviorSubject<AppConfig>({ bolivianosEs: 'LOCAL' });

  /** Carga la config desde el servidor — se puede llamar múltiples veces */
  async load(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http.get<AppConfig>(`${environment.apiUrl}/app-config`, {
          headers: { 'X-Skip-Error-Handler': 'true' },
        }),
      );
      config.bolivianosEs = (config.bolivianosEs ?? 'LOCAL').toString().toUpperCase() as 'LOCAL' | 'SISTEMA';
      this._config$.next(config);
    } catch (e) {
      console.warn('AppConfigService: usando LOCAL por defecto.', e);
    }
  }

  get bolivianosEs(): 'LOCAL' | 'SISTEMA' {
    return this._config$.value.bolivianosEs;
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