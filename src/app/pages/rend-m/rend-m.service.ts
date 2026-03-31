import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RendM, CreateRendMPayload, UpdateRendMPayload } from '../../models/rend-m.model';
import { environment } from '../../../environments/environment';

export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class RendMService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/rend-m`;

  /** Rendiciones propias del usuario logueado */
  getAll(options: { idPerfil?: number; page?: number; limit?: number; } = {}) {
    let params = new HttpParams();
    if (options.idPerfil !== undefined) params = params.set('idPerfil', options.idPerfil);
    if (options.page     !== undefined) params = params.set('page',     options.page);
    if (options.limit    !== undefined) params = params.set('limit',    options.limit);
    return this.http.get<PaginatedResult<RendM>>(this.api, { params });
  }

  /**
   * Rendiciones de subordinados del aprobador/sincronizador.
   * estados: array de números (ej: [1,4]) — vacío = todos los estados
   */
  getSubordinados(options: {
    estados?:   number[];
    idPerfil?:  number;
    idUsuario?: string;
    page?:      number;
    limit?:     number;
  } = {}) {
    let params = new HttpParams();
    if (options.estados?.length)        params = params.set('estados',  options.estados.join(','));
    if (options.idPerfil !== undefined)  params = params.set('idPerfil', options.idPerfil);
    if (options.idUsuario)              params = params.set('idUsuario', options.idUsuario);
    if (options.page     !== undefined)  params = params.set('page',     options.page);
    if (options.limit    !== undefined)  params = params.set('limit',    options.limit);
    return this.http.get<PaginatedResult<RendM>>(`${this.api}/subordinados`, { params });
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