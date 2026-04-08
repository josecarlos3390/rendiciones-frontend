import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Dimension,
  CrearDimensionPayload,
  ActualizarDimensionPayload,
  DimensionFiltro,
} from '../models/dimension.model';

@Injectable({
  providedIn: 'root',
})
export class DimensionesService {
  private readonly baseUrl = `${environment.apiUrl}/dimensiones`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todas las dimensiones aplicando filtros opcionales
   */
  getDimensiones(filtro?: DimensionFiltro): Observable<Dimension[]> {
    let params = new HttpParams();

    if (filtro?.code !== undefined) {
      params = params.set('code', filtro.code.toString());
    }
    if (filtro?.name) {
      params = params.set('name', filtro.name);
    }
    if (filtro?.activa !== undefined) {
      params = params.set('activa', filtro.activa.toString());
    }
    if (filtro?.sortBy) {
      params = params.set('sortBy', filtro.sortBy);
    }
    if (filtro?.sortOrder) {
      params = params.set('sortOrder', filtro.sortOrder);
    }

    return this.http.get<Dimension[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene una dimensión por su código
   */
  getDimensionByCode(code: number): Observable<Dimension> {
    return this.http.get<Dimension>(`${this.baseUrl}/${code}`);
  }

  /**
   * Crea una nueva dimensión
   */
  crearDimension(payload: CrearDimensionPayload): Observable<Dimension> {
    return this.http.post<Dimension>(this.baseUrl, payload);
  }

  /**
   * Actualiza una dimensión existente
   */
  actualizarDimension(
    code: number,
    payload: ActualizarDimensionPayload,
  ): Observable<Dimension> {
    return this.http.put<Dimension>(
      `${this.baseUrl}/${code}`,
      payload,
    );
  }

  /**
   * Elimina una dimensión
   */
  eliminarDimension(code: number): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(`${this.baseUrl}/${code}`);
  }

  /**
   * Cambia el estado activo/inactivo de una dimensión
   */
  toggleActivo(code: number): Observable<Dimension> {
    return this.http.patch<Dimension>(
      `${this.baseUrl}/${code}/toggle-active`,
      {},
    );
  }
}
