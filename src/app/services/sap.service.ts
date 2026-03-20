import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DistributionRule {
  factorCode:        string;
  factorDescription: string;
}

export interface DimensionWithRules {
  dimensionCode:        number;
  dimensionName:        string;
  dimensionDescription: string;
  rules:                DistributionRule[];
}

export interface ChartOfAccount {
  code:       string;
  name:       string;
  formatCode: string;
  lockManual: string;
}

export interface CuentaDto {
  code: string;
  name: string;
}

export interface ProveedorDto {
  cardCode: string;
  cardName: string;
}

@Injectable({ providedIn: 'root' })
export class SapService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/sap`;

  private dimensions$:      Observable<DimensionWithRules[]> | null = null;
  private chartOfAccounts$: Observable<ChartOfAccount[]>    | null = null;

  getDimensions(): Observable<DimensionWithRules[]> {
    if (!this.dimensions$) {
      this.dimensions$ = this.http
        .get<DimensionWithRules[]>(`${this.api}/dimensions`)
        .pipe(shareReplay(1));
    }
    return this.dimensions$;
  }

  getChartOfAccounts(): Observable<ChartOfAccount[]> {
    if (!this.chartOfAccounts$) {
      this.chartOfAccounts$ = this.http
        .get<ChartOfAccount[]>(`${this.api}/chart-of-accounts`)
        .pipe(shareReplay(1));
    }
    return this.chartOfAccounts$;
  }

  getCuentas(params: {
    cueCar:        string;
    cueTexto?:     string;
    busqueda?:     string;
    listaCuentas?: CuentaDto[];
  }): Observable<CuentaDto[]> {
    let httpParams = new HttpParams().set('cueCar', params.cueCar);
    if (params.cueTexto)  httpParams = httpParams.set('cueTexto', params.cueTexto);
    if (params.busqueda)  httpParams = httpParams.set('busqueda', params.busqueda);
    if (params.cueCar === 'LISTA' && params.listaCuentas?.length) {
      httpParams = httpParams.set('lista', JSON.stringify(params.listaCuentas));
    }
    return this.http.get<CuentaDto[]>(`${this.api}/cuentas`, { params: httpParams });
  }

  getProveedores(params: {
    car:       string;
    filtro?:   string;
    busqueda?: string;
  }): Observable<ProveedorDto[]> {
    let httpParams = new HttpParams().set('car', params.car);
    if (params.filtro)   httpParams = httpParams.set('filtro',   params.filtro);
    if (params.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    return this.http.get<ProveedorDto[]>(`${this.api}/proveedores`, { params: httpParams });
  }

  /**
   * Solo limpia la caché en memoria, sin llamar al backend.
   * Usar cuando no hay JWT disponible (ej: APP_INITIALIZER al arrancar).
   * La próxima vez que se pidan dimensiones o cuentas, se cargarán frescos.
   */
  clearCache(): void {
    this.dimensions$      = null;
    this.chartOfAccounts$ = null;
  }

  /**
   * Limpia la caché Y fuerza recarga desde el servidor.
   * Usar solo cuando hay JWT activo (ej: acción manual de ADMIN).
   */
  refreshAll(): void {
    this.clearCache();
    this.http.post(`${this.api}/dimensions/refresh`, {}).subscribe();
  }
}