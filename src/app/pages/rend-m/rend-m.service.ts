import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RendM, CreateRendMPayload, UpdateRendMPayload } from '../../models/rend-m.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RendMService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/rend-m`;

  getAll(idPerfil?: number) {
    const params = idPerfil !== undefined
      ? new HttpParams().set('idPerfil', idPerfil)
      : undefined;
    return this.http.get<RendM[]>(this.api, { params });
  }

  getOne(id: number) {
    return this.http.get<RendM>(`${this.api}/${id}`);
  }

  create(data: CreateRendMPayload) {
    return this.http.post<RendM>(this.api, data);
  }

  update(id: number, data: UpdateRendMPayload) {
    return this.http.patch<RendM>(`${this.api}/${id}`, data);
  }

  remove(id: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${id}`);
  }
}