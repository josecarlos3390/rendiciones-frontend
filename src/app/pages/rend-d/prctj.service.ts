import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RendPrctj, SavePrctjPayload } from '../../models/prctj.model';

@Injectable({ providedIn: 'root' })
export class PrctjService {
  private http = inject(HttpClient);
  private base  = `${environment.apiUrl}/rend-m`;

  private url(idRendicion: number, idRD: number): string {
    return `${this.base}/${idRendicion}/detalle/${idRD}/prctj`;
  }

  getAll(idRendicion: number, idRD: number) {
    return this.http.get<RendPrctj[]>(this.url(idRendicion, idRD));
  }

  save(idRendicion: number, idRD: number, payload: SavePrctjPayload) {
    return this.http.post<RendPrctj[]>(this.url(idRendicion, idRD), payload);
  }

  delete(idRendicion: number, idRD: number) {
    return this.http.delete<{ deleted: boolean }>(this.url(idRendicion, idRD));
  }
}