import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Permiso, UsuarioSimple, CreatePermisoPayload } from '@models/permiso.model';
import { Perfil } from '@models/perfil.model';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/permisos`;
  private apiPerfiles = `${environment.apiUrl}/perfiles`;

  getUsuarios() {
    return this.http.get<UsuarioSimple[]>(`${this.api}/usuarios`);
  }

  getPerfiles() {
    return this.http.get<Perfil[]>(this.apiPerfiles);
  }

  /** Perfiles asignados al usuario autenticado (cualquier rol) */
  getMisPerfiles() {
    return this.http.get<Permiso[]>(`${this.api}/mis-perfiles`);
  }

  getByUsuario(idUsuario: number) {
    return this.http.get<Permiso[]>(`${this.api}/usuario/${idUsuario}`);
  }

  create(data: CreatePermisoPayload) {
    return this.http.post<Permiso>(this.api, data);
  }

  remove(idUsuario: number, idPerfil: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${idUsuario}/${idPerfil}`);
  }
}
