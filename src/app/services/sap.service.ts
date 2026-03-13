import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  code:       string;   // → U_CuentaSys
  name:       string;   // → U_CuentaNombre
  formatCode: string;   // → U_CuentaFormatCode
  lockManual: string;   // 'tYES'|'tNO' → U_CuentaAsociada
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

  refreshAll() {
    this.dimensions$      = null;
    this.chartOfAccounts$ = null;
    this.http.post(`${this.api}/dimensions/refresh`, {}).subscribe();
  }
}