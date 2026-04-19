import { Injectable, inject } from '@angular/core';
import { HttpClient }          from '@angular/common/http';
import { environment }         from '@env';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { AiService, PdfProcessingResult } from './ai.service';

export interface FacturaSiat {
  cuf:           string;
  nit:           string;
  invoiceNumber: string;
  companyName:   string;
  clientName:    string;
  clientDoc:     string;
  status:        string;
  datetime:      string | null;
  total:         number;
  concepto?:     string;  // Concepto ingresado/editable por el usuario
}

export interface FacturaResult {
  success: boolean;
  source: 'siat' | 'ai_claude' | 'manual';
  data?: FacturaSiat | PdfProcessingResult['data'];
  confidence?: number;
  warnings?: string[];
  error?: string;
  requiresManualEntry?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FacturaService {
  private http = inject(HttpClient);
  private aiService = inject(AiService);
  private api  = `${environment.apiUrl}/factura`;

  getFromSiat(url: string) {
    return this.http.get<FacturaSiat>(`${this.api}/siat`, {
      params: { url },
    });
  }

  /**
   * Procesa un PDF de factura intentando múltiples estrategias:
   * 1. Intenta obtener datos del SIAT vía QR
   * 2. Si falla y IA está habilitada, usa Claude
   * 3. Si IA no está habilitada, retorna error con mensaje informativo
   * 
   * @param file Archivo PDF
   * @param qrUrl URL extraída del QR (opcional)
   * @param cuf CUF extraído del QR (opcional, para usar si el SIAT falla)
   */
  processFacturaPdf(file: File, qrUrl?: string, cuf?: string): Observable<FacturaResult> {
    // Si tenemos URL del QR, intentar SIAT primero
    if (qrUrl) {
      return this.getFromSiat(qrUrl).pipe(
        map((siatData): FacturaResult => ({
          success: true,
          source: 'siat',
          data: siatData,
          confidence: 1.0,
          warnings: []
        })),
        catchError((error) => {
          console.warn('Error consultando SIAT:', error);
          // Fallar a IA si está disponible, pasando el CUF extraído del QR
          return this.tryProcessWithAi(file, cuf);
        })
      );
    }
    
    // Sin URL de QR, ir directo a IA
    return this.tryProcessWithAi(file, cuf);
  }

  /**
   * Intenta procesar con IA (Claude)
   * @param file Archivo PDF
   * @param fallbackCuf CUF a usar si la IA no lo detecta (ej: del QR)
   */
  private tryProcessWithAi(file: File, fallbackCuf?: string): Observable<FacturaResult> {
    return this.aiService.isEnabled().pipe(
      switchMap((isEnabled): Observable<FacturaResult> => {
        if (!isEnabled) {
          // IA no está habilitada
          const result: FacturaResult = {
            success: false,
            source: 'manual',
            error: 'No se pudo obtener datos automáticamente. El SIAT no está disponible y la funcionalidad de IA no está configurada.',
            requiresManualEntry: true
          };
          return of(result);
        }
        
        // Procesar con IA
        return this.aiService.processPdfs([file]).pipe(
          map((response): FacturaResult => {
            const result = response.results[0];
            
            if (result.status === 'error') {
              return {
                success: false,
                source: 'ai_claude',
                error: result.errorMessage || 'Error procesando con IA',
                requiresManualEntry: true
              };
            }
            
            // Usar CUF del fallback si la IA no lo detectó
            const cuf = result.data.cuf || fallbackCuf || '';
            
            // Mapear datos de IA al formato esperado
            return {
              success: true,
              source: 'ai_claude',
              data: {
                cuf: cuf,
                nit: result.data.nit || '',
                invoiceNumber: result.data.numeroFactura || '',
                companyName: result.data.razonSocial || '',
                clientName: '',
                clientDoc: '',
                status: 'VALIDA',
                datetime: result.data.fecha || null,
                total: result.data.monto || 0
              },
              confidence: result.confidence,
              warnings: result.warnings
            };
          }),
          catchError((error): Observable<FacturaResult> => {
            console.error('Error procesando con IA:', error);
            const result: FacturaResult = {
              success: false,
              source: 'ai_claude',
              error: 'Error al procesar con IA: ' + (error.message || 'Error desconocido'),
              requiresManualEntry: true
            };
            return of(result);
          })
        );
      })
    );
  }
}