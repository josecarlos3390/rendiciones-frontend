import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';

export interface RendCmp {
  U_IdCampo:     number;
  U_Descripcion: string;
  U_Campo:       string;
}

@Injectable({ providedIn: 'root' })
export class RendCmpService {
  private api  = environment.apiUrl;
  private http = inject(HttpClient);

  getAll(): Observable<RendCmp[]> {
    return this.http.get<RendCmp[]>(`${this.api}/rend-cmp`);
  }

  create(data: { descripcion: string; campo: string }): Observable<RendCmp> {
    return this.http.post<RendCmp>(`${this.api}/rend-cmp`, data);
  }

  update(id: number, data: { descripcion?: string; campo?: string }): Observable<RendCmp> {
    return this.http.patch<RendCmp>(`${this.api}/rend-cmp/${id}`, data);
  }

  remove(id: number): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(`${this.api}/rend-cmp/${id}`);
  }
}