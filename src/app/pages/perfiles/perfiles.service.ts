import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Perfil, CreatePerfilPayload, UpdatePerfilPayload } from '../../models/perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PerfilesService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/perfiles`;

  getAll() {
    return this.http.get<Perfil[]>(this.api);
  }

  getOne(id: number) {
    return this.http.get<Perfil>(`${this.api}/${id}`);
  }

  create(data: CreatePerfilPayload) {
    return this.http.post<Perfil>(this.api, data);
  }

  update(id: number, data: UpdatePerfilPayload) {
    return this.http.patch<Perfil>(`${this.api}/${id}`, data);
  }

  remove(id: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${id}`);
  }
}
