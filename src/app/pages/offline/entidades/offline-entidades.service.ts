import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Entidad {
  U_CODIGO:       string;
  U_NIT:          string;
  U_RAZON_SOCIAL: string;
  U_TIPO:         string;
}

@Injectable({ providedIn: 'root' })
export class OfflineEntidadesService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/prov`;

  getAll(tipo: string)   { return this.http.get<Entidad[]>(`${this.api}?tipo=${tipo}`); }
  create(data: { tipo: string; nit: string; razonSocial: string }) { return this.http.post<Entidad>(this.api, data); }
  update(codigo: string, data: { nit?: string; razonSocial?: string }) { return this.http.patch<{ affected: number }>(`${this.api}/${codigo}`, data); }
  remove(codigo: string) { return this.http.delete<{ affected: number }>(`${this.api}/${codigo}`); }
}