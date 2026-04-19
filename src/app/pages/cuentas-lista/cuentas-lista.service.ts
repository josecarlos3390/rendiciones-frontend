import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CuentaLista, CreateCuentaListaPayload } from '@models/cuenta-lista.model';
import { Perfil } from '@models/perfil.model';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class CuentasListaService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/cuentas-lista`;
  private apiPerfiles = `${environment.apiUrl}/perfiles`;

  getPerfiles() {
    return this.http.get<Perfil[]>(this.apiPerfiles);
  }

  getAll() {
    return this.http.get<CuentaLista[]>(this.api);
  }

  getByPerfil(idPerfil: number) {
    return this.http.get<CuentaLista[]>(`${this.api}/perfil/${idPerfil}`);
  }

  create(data: CreateCuentaListaPayload) {
    return this.http.post<CuentaLista>(this.api, data);
  }

  remove(idPerfil: number, cuentaSys: string) {
    return this.http.delete<{ affected: number }>(
      `${this.api}/${idPerfil}/${encodeURIComponent(cuentaSys)}`,
    );
  }
}
