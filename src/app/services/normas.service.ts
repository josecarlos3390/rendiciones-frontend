import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import {
  Norma,
  NormaConDimension,
  CrearNormaPayload,
  ActualizarNormaPayload,
  NormaFiltro,
} from '@models/norma.model';

@Injectable({
  providedIn: 'root',
})
export class NormasService {
  private readonly baseUrl = `${environment.apiUrl}/normas`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todas las normas aplicando filtros opcionales
   */
  getNormas(filtro?: NormaFiltro): Observable<NormaConDimension[]> {
    let params = new HttpParams();

    if (filtro?.factorCode) {
      params = params.set('factorCode', filtro.factorCode);
    }
    if (filtro?.descripcion) {
      params = params.set('descripcion', filtro.descripcion);
    }
    if (filtro?.dimension !== undefined) {
      params = params.set('dimension', filtro.dimension.toString());
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

    return this.http.get<NormaConDimension[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene una norma por su código de factor
   */
  getNormaByFactorCode(factorCode: string): Observable<Norma> {
    return this.http.get<Norma>(
      `${this.baseUrl}/${encodeURIComponent(factorCode)}`,
    );
  }

  /**
   * Crea una nueva norma
   */
  crearNorma(payload: CrearNormaPayload): Observable<Norma> {
    return this.http.post<Norma>(this.baseUrl, payload);
  }

  /**
   * Actualiza una norma existente
   */
  actualizarNorma(
    factorCode: string,
    payload: ActualizarNormaPayload,
  ): Observable<Norma> {
    return this.http.put<Norma>(
      `${this.baseUrl}/${encodeURIComponent(factorCode)}`,
      payload,
    );
  }

  /**
   * Elimina una norma
   */
  eliminarNorma(factorCode: string): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(
      `${this.baseUrl}/${encodeURIComponent(factorCode)}`,
    );
  }

  /**
   * Cambia el estado activo/inactivo de una norma
   */
  toggleActivo(factorCode: string): Observable<Norma> {
    return this.http.patch<Norma>(
      `${this.baseUrl}/${encodeURIComponent(factorCode)}/toggle-active`,
      {},
    );
  }
}
