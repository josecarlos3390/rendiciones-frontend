import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RendD, CreateRendDPayload, UpdateRendDPayload } from '@models/rend-d.model';
import { environment } from '@env';

@Injectable({ providedIn: 'root' })
export class RendDService {
  private http = inject(HttpClient);

  private api(idRendicion: number) {
    return `${environment.apiUrl}/rend-m/${idRendicion}/detalle`;
  }

  getAll(idRendicion: number) {
    return this.http.get<RendD[]>(this.api(idRendicion));
  }

  getOne(idRendicion: number, idRD: number) {
    return this.http.get<RendD>(`${this.api(idRendicion)}/${idRD}`);
  }

  create(idRendicion: number, data: CreateRendDPayload) {
    return this.http.post<RendD>(this.api(idRendicion), data);
  }

  update(idRendicion: number, idRD: number, data: UpdateRendDPayload) {
    return this.http.patch<RendD>(`${this.api(idRendicion)}/${idRD}`, data);
  }

  remove(idRendicion: number, idRD: number) {
    return this.http.delete<{ affected: number }>(`${this.api(idRendicion)}/${idRD}`);
  }
}
