import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import {
  Proyecto,
  CrearProyectoPayload,
  ActualizarProyectoPayload,
  ProyectoFiltro,
} from '@models/proyecto.model';

@Injectable({
  providedIn: 'root',
})
export class ProyectosService {
  private readonly baseUrl = `${environment.apiUrl}/proyectos`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todos los proyectos aplicando filtros opcionales
   */
  getProyectos(filtro?: ProyectoFiltro): Observable<Proyecto[]> {
    let params = new HttpParams();

    if (filtro?.code) {
      params = params.set('code', filtro.code);
    }
    if (filtro?.name) {
      params = params.set('name', filtro.name);
    }
    if (filtro?.activo !== undefined) {
      params = params.set('activo', filtro.activo.toString());
    }
    if (filtro?.sortBy) {
      params = params.set('sortBy', filtro.sortBy);
    }
    if (filtro?.sortOrder) {
      params = params.set('sortOrder', filtro.sortOrder);
    }

    return this.http.get<Proyecto[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene un proyecto por su código
   */
  getProyectoByCode(code: string): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.baseUrl}/${encodeURIComponent(code)}`);
  }

  /**
   * Crea un nuevo proyecto
   */
  crearProyecto(payload: CrearProyectoPayload): Observable<Proyecto> {
    return this.http.post<Proyecto>(this.baseUrl, payload);
  }

  /**
   * Actualiza un proyecto existente
   */
  actualizarProyecto(
    code: string,
    payload: ActualizarProyectoPayload,
  ): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.baseUrl}/${encodeURIComponent(code)}`,
      payload,
    );
  }

  /**
   * Elimina un proyecto
   */
  eliminarProyecto(code: string): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(
      `${this.baseUrl}/${encodeURIComponent(code)}`,
    );
  }

  /**
   * Cambia el estado activo/inactivo de un proyecto
   */
  toggleActivo(code: string): Observable<Proyecto> {
    return this.http.put<Proyecto>(
      `${this.baseUrl}/${encodeURIComponent(code)}/toggle-active`,
      {},
    );
  }
}
