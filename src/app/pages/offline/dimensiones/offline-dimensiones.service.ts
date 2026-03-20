import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface Dimension {
  DIM_CODE:        number;
  DIM_NAME:        string;
  DIM_DESCRIPCION: string;
  DIM_ACTIVA:      'Y' | 'N';
}

@Injectable({ providedIn: 'root' })
export class OfflineDimensionesService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/offline/dimensiones`;

  getAll()                                     { return this.http.get<Dimension[]>(this.api); }
  create(data: Partial<Dimension>)             { return this.http.post<Dimension>(this.api, data); }
  update(code: number, data: Partial<Dimension>) { return this.http.patch<{ affected: number }>(`${this.api}/${code}`, data); }
  remove(code: number)                         { return this.http.delete<{ affected: number }>(`${this.api}/${code}`); }
}