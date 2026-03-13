// ═══════════════════════════════════════════════════════════════════════════
//  PLANTILLA ESTÁNDAR — Servicio HTTP
//
//  Renombrar: MiEntidad → NombreReal, mi-entidad → nombre-real
//  Ajustar:   this.api  → ruta real del backend (ej: /categorias)
// ═══════════════════════════════════════════════════════════════════════════

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  MiEntidad,
  CreateMiEntidadPayload,
  UpdateMiEntidadPayload,
} from '../../models/mi-entidad.model';

@Injectable({ providedIn: 'root' })
export class MiEntidadService {

  private http = inject(HttpClient);

  // TODO: cambiar 'mi-entidad' por el endpoint real del backend
  private api = `${environment.apiUrl}/mi-entidad`;

  /** Lista completa */
  getAll() {
    return this.http.get<MiEntidad[]>(this.api);
  }

  /** Un registro por ID */
  getOne(id: number) {
    return this.http.get<MiEntidad>(`${this.api}/${id}`);
  }

  // ── Si necesitás filtrar por perfil (como documentos, cuentas, etc.) ──────
  // getByPerfil(idPerfil: number) {
  //   return this.http.get<MiEntidad[]>(`${this.api}?perfil=${idPerfil}`);
  // }

  /** Crear nuevo registro */
  create(data: CreateMiEntidadPayload) {
    return this.http.post<MiEntidad>(this.api, data);
  }

  /** Actualizar registro existente */
  update(id: number, data: UpdateMiEntidadPayload) {
    return this.http.patch<MiEntidad>(`${this.api}/${id}`, data);
  }

  /** Eliminar registro */
  remove(id: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${id}`);
  }
}
