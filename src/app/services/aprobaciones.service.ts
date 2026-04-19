import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';

export interface AprobacionNivel {
  U_IdRendicion: number;
  U_Nivel:       number;
  U_LoginAprob:  string;
  U_NomAprob:    string;
  U_Estado:      'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  U_FechaAprob:  string | null;
  U_Comentario:  string | null;
}

export interface AprobacionPendiente extends AprobacionNivel {
  U_IdUsuario:    number;
  U_NomUsuario:   string;
  U_NombrePerfil: string;
  U_Objetivo:     string;
  U_FechaIni:     string;
  U_FechaFinal:   string;
  U_Monto:        number;
  U_Estado_Rend:  number;
}

@Injectable({ providedIn: 'root' })
export class AprobacionesService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/aprobaciones`;

  getPendientes()                    { return this.http.get<AprobacionPendiente[]>(`${this.api}/pendientes`); }
  getPendientesNivel2()               { return this.http.get<AprobacionPendiente[]>(`${this.api}/pendientes-nivel2`); }
  countPendientes()                  { return this.http.get<{ count: number }>(`${this.api}/count`); }
  countPendientesNivel2()            { return this.http.get<{ count: number }>(`${this.api}/count-nivel2`); }
  getNiveles(idRendicion: number)    { return this.http.get<AprobacionNivel[]>(`${this.api}/${idRendicion}/niveles`); }
  enviar(idRendicion: number)        { return this.http.post<any>(`${this.api}/${idRendicion}/enviar`, {}); }
  aprobar(idRendicion: number, comentario?: string) {
    return this.http.post<any>(`${this.api}/${idRendicion}/aprobar`, { comentario });
  }
  rechazar(idRendicion: number, comentario?: string) {
    return this.http.post<any>(`${this.api}/${idRendicion}/rechazar`, { comentario });
  }
}