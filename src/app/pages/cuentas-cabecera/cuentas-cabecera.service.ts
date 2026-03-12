import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CuentaCabecera, CreateCuentaCabeceraPayload } from '../../models/cuenta-cabecera.model';
import { Perfil } from '../../models/perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CuentasCabeceraService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/cuentas-cabecera`;
  private apiPerfiles = `${environment.apiUrl}/perfiles`;

  getPerfiles() {
    return this.http.get<Perfil[]>(this.apiPerfiles);
  }

  getAll() {
    return this.http.get<CuentaCabecera[]>(this.api);
  }

  getByPerfil(idPerfil: number) {
    return this.http.get<CuentaCabecera[]>(`${this.api}/perfil/${idPerfil}`);
  }

  create(data: CreateCuentaCabeceraPayload) {
    return this.http.post<CuentaCabecera>(this.api, data);
  }

  remove(idPerfil: number, cuentaSys: string) {
    return this.http.delete<{ affected: number }>(
      `${this.api}/${idPerfil}/${encodeURIComponent(cuentaSys)}`,
    );
  }
}
