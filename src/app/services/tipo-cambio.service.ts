import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TipoCambio {
  id: number;
  fecha: string;
  moneda: string;
  tasa: number;
  activo: string;
  fechaCreacion?: string;
}

export interface CreateTipoCambioDto {
  fecha: string;
  moneda: string;
  tasa: number;
}

export interface UpdateTipoCambioDto {
  tasa?: number;
  activo?: string;
}

export interface TipoCambioFilter {
  fechaDesde?: string;
  fechaHasta?: string;
  moneda?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TipoCambioService {
  private apiUrl = `${environment.apiUrl}/tipo-cambio`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener lista de tasas de cambio
   */
  findAll(): Observable<TipoCambio[]> {
    return this.http.get<TipoCambio[]>(this.apiUrl);
  }

  /**
   * Obtener tasas de cambio con filtros
   */
  findWithFilters(filter: TipoCambioFilter): Observable<TipoCambio[]> {
    let params = new HttpParams();
    
    if (filter.fechaDesde) {
      params = params.set('fechaDesde', filter.fechaDesde);
    }
    if (filter.fechaHasta) {
      params = params.set('fechaHasta', filter.fechaHasta);
    }
    if (filter.moneda) {
      params = params.set('moneda', filter.moneda);
    }

    return this.http.get<TipoCambio[]>(`${this.apiUrl}/filter`, { params });
  }

  /**
   * Obtener una tasa específica
   */
  findOne(id: number): Observable<TipoCambio> {
    return this.http.get<TipoCambio>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener tasa por fecha y moneda
   */
  findByFechaMoneda(fecha: string, moneda: string): Observable<TipoCambio> {
    return this.http.get<TipoCambio>(`${this.apiUrl}/fecha/${fecha}/moneda/${moneda}`);
  }

  /**
   * Crear nueva tasa de cambio
   */
  create(dto: CreateTipoCambioDto): Observable<TipoCambio> {
    return this.http.post<TipoCambio>(this.apiUrl, dto);
  }

  /**
   * Actualizar tasa de cambio
   */
  update(id: number, dto: UpdateTipoCambioDto): Observable<TipoCambio> {
    return this.http.patch<TipoCambio>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Eliminar tasa de cambio
   */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtener tasa actual del sistema (USD)
   */
  obtenerTasaActual(): Observable<{ tasa: number; fecha: string }> {
    const today = new Date().toISOString().split('T')[0];
    return this.http.get<{ tasa: number; fecha: string }>(
      `${this.apiUrl}/fecha/${today}/moneda/USD`
    );
  }
}
