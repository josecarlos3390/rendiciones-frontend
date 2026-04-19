import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import {
  CuentaCOA,
  CrearCuentaPayload,
  ActualizarCuentaPayload,
  CoaFiltro,
} from '@models/coa.model';

@Injectable({
  providedIn: 'root',
})
export class CoaService {
  private readonly baseUrl = `${environment.apiUrl}/coa`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Obtiene todas las cuentas aplicando filtros opcionales
   */
  getCuentas(filtro?: CoaFiltro): Observable<CuentaCOA[]> {
    let params = new HttpParams();

    if (filtro?.code) {
      params = params.set('code', filtro.code);
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

    return this.http.get<CuentaCOA[]>(this.baseUrl, { params });
  }

  /**
   * Obtiene una cuenta por su código
   */
  getCuentaByCode(code: string): Observable<CuentaCOA> {
    return this.http.get<CuentaCOA>(`${this.baseUrl}/${encodeURIComponent(code)}`);
  }

  /**
   * Crea una nueva cuenta
   */
  crearCuenta(payload: CrearCuentaPayload): Observable<CuentaCOA> {
    return this.http.post<CuentaCOA>(this.baseUrl, payload);
  }

  /**
   * Actualiza una cuenta existente
   */
  actualizarCuenta(
    code: string,
    payload: ActualizarCuentaPayload,
  ): Observable<CuentaCOA> {
    return this.http.put<CuentaCOA>(
      `${this.baseUrl}/${encodeURIComponent(code)}`,
      payload,
    );
  }

  /**
   * Elimina una cuenta
   */
  eliminarCuenta(code: string): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(
      `${this.baseUrl}/${encodeURIComponent(code)}`,
    );
  }

  /**
   * Cambia el estado activo/inactivo de una cuenta
   */
  toggleActivo(code: string): Observable<CuentaCOA> {
    return this.http.patch<CuentaCOA>(
      `${this.baseUrl}/${encodeURIComponent(code)}/toggle-active`,
      {},
    );
  }
}
