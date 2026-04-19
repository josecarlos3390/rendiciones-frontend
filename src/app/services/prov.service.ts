import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';

export interface ProvEventual {
  U_NIT:          string;
  U_RAZON_SOCIAL: string;
}

@Injectable({ providedIn: 'root' })
export class ProvService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/prov`;

  getAll()                              { return this.http.get<ProvEventual[]>(this.api); }
  create(nit: string, razonSocial: string) {
    return this.http.post<ProvEventual>(this.api, { nit, razonSocial });
  }
  remove(nit: string)                   { return this.http.delete<{ affected: number }>(`${this.api}/${encodeURIComponent(nit)}`); }

  /** Busca proveedor por NIT — si no existe lo crea automáticamente como PL */
  findOrCreate(nit: string, razonSocial: string) {
    return this.http.post<ProvEventual>(`${this.api}/find-or-create`, { nit, razonSocial, tipo: 'PL' });
  }
}