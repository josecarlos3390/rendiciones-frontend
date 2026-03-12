import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Documento, CreateDocumentoPayload, UpdateDocumentoPayload } from '../../models/documento.model';
import { Perfil } from '../../models/perfil.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/documentos`;
  private apiPerfiles = `${environment.apiUrl}/perfiles`;

  getPerfiles() {
    return this.http.get<Perfil[]>(this.apiPerfiles);
  }

  getAll() {
    return this.http.get<Documento[]>(this.api);
  }

  getByPerfil(codPerfil: number) {
    return this.http.get<Documento[]>(`${this.api}/perfil/${codPerfil}`);
  }

  getOne(id: number) {
    return this.http.get<Documento>(`${this.api}/${id}`);
  }

  create(data: CreateDocumentoPayload) {
    return this.http.post<Documento>(this.api, data);
  }

  update(id: number, data: UpdateDocumentoPayload) {
    return this.http.patch<Documento>(`${this.api}/${id}`, data);
  }

  remove(id: number) {
    return this.http.delete<{ affected: number }>(`${this.api}/${id}`);
  }
}
