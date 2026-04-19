import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env';
import { Adjunto } from '@models/adjunto.model';

@Injectable({
  providedIn: 'root',
})
export class AdjuntosService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Lista todos los adjuntos de una línea de rendición
   */
  getAdjuntos(idRendicion: number, idRD: number): Observable<Adjunto[]> {
    return this.http.get<Adjunto[]>(
      `${this.baseUrl}/rend-m/${idRendicion}/detalle/${idRD}/adjuntos`
    );
  }

  /**
   * Sube un archivo adjunto
   */
  uploadAdjunto(
    idRendicion: number,
    idRD: number,
    file: File,
    descripcion?: string,
  ): Observable<Adjunto> {
    const formData = new FormData();
    formData.append('file', file);
    if (descripcion) {
      formData.append('descripcion', descripcion);
    }

    return this.http.post<Adjunto>(
      `${this.baseUrl}/rend-m/${idRendicion}/detalle/${idRD}/adjuntos`,
      formData,
    );
  }

  /**
   * Descarga un archivo adjunto
   */
  downloadAdjunto(idAdjunto: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/adjuntos/${idAdjunto}/download`, {
      responseType: 'blob',
    });
  }

  /**
   * Obtiene blob para preview de archivo
   */
  viewAdjunto(idAdjunto: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/adjuntos/${idAdjunto}/view`, {
      responseType: 'blob',
    });
  }

  /**
   * Elimina un archivo adjunto
   */
  eliminarAdjunto(idAdjunto: number): Observable<{ affected: number }> {
    return this.http.delete<{ affected: number }>(
      `${this.baseUrl}/adjuntos/${idAdjunto}`,
    );
  }
}
