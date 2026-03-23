import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RendPendiente {
  U_IdRendicion:  number;
  U_IdUsuario:    string;
  U_NomUsuario:   string;
  U_NombrePerfil: string;
  U_Objetivo:     string;
  U_FechaIni:     string;
  U_FechaFinal:   string;
  U_Monto:        number;
  U_Estado:       number;
}

export interface RendSync {
  U_IdSync:      number;
  U_IdRendicion: number;
  U_Estado:      string;
  U_NroDocERP:   string | null;
  U_FechaSync:   string | null;
  U_LoginAdmin:  string | null;
  U_Mensaje:     string | null;
  U_Intento:     number;
}

export interface SyncResult {
  success:    boolean;
  nroDocERP?: string;
  mensaje:    string;
  estado:     string;
}

@Injectable({ providedIn: 'root' })
export class IntegracionService {
  private api = environment.apiUrl;
  private http = inject(HttpClient);

  getPendientes(): Observable<RendPendiente[]> {
    return this.http.get<RendPendiente[]>(`${this.api}/integracion/pendientes`);
  }

  countPendientes(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.api}/integracion/count`);
  }

  getHistorial(idRendicion: number): Observable<RendSync[]> {
    return this.http.get<RendSync[]>(`${this.api}/integracion/${idRendicion}/historial`);
  }

  sincronizar(idRendicion: number): Observable<SyncResult> {
    return this.http.post<SyncResult>(`${this.api}/integracion/${idRendicion}/sincronizar`, {});
  }
}