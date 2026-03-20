import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Norma {
  NR_FACTOR_CODE: string;
  NR_DESCRIPCION: string;
  NR_DIMENSION:   number;
  NR_ACTIVA:      'Y' | 'N';
  DIM_NAME?:      string;
}

@Injectable({ providedIn: 'root' })
export class OfflineNormasService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/offline/normas`;

  getAll()                                       { return this.http.get<Norma[]>(this.api); }
  create(data: Partial<Norma>)                   { return this.http.post<Norma>(this.api, data); }
  update(code: string, data: Partial<Norma>)     { return this.http.patch<{ affected: number }>(`${this.api}/${code}`, data); }
  remove(code: string)                           { return this.http.delete<{ affected: number }>(`${this.api}/${code}`); }
}