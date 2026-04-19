import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env';

export interface TipoDocSap {
  U_IdTipo:    number;
  U_Nombre:    string;
  U_EsTipoF:   'F' | 'R';
  U_PermiteGU: 'Y' | 'N';
  U_PermiteGD: 'Y' | 'N';
  U_Orden:     number;
  U_Activo:    'Y' | 'N';
}

export interface CreateTipoDocSapPayload {
  idTipo:    number;
  nombre:    string;
  esTipoF:   'F' | 'R';
  permiteGU: boolean;
  permiteGD: boolean;
  orden:     number;
  activo:    boolean;
}

export type UpdateTipoDocSapPayload = Partial<Omit<CreateTipoDocSapPayload, 'idTipo'>>;

@Injectable({ providedIn: 'root' })
export class TipoDocSapService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/tipo-doc-sap`;

  getAll()     { return this.http.get<TipoDocSap[]>(this.api); }
  getActivos() { return this.http.get<TipoDocSap[]>(`${this.api}/activos`); }
  getOne(id: number) { return this.http.get<TipoDocSap>(`${this.api}/${id}`); }

  create(payload: CreateTipoDocSapPayload) {
    return this.http.post<TipoDocSap>(this.api, payload);
  }
  update(id: number, payload: UpdateTipoDocSapPayload) {
    return this.http.patch<TipoDocSap>(`${this.api}/${id}`, payload);
  }
  remove(id: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${id}`);
  }
}