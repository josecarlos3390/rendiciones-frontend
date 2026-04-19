import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';
import { environment } from '@env';

export interface PdfProcessingResult {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  source: 'ai_claude' | 'ai_openai' | 'manual';
  confidence: number;
  data: {
    nit?: string;
    razonSocial?: string;
    numeroFactura?: string;
    fecha?: string;
    monto?: number;
    concepto?: string;
    codigoControl?: string | null;
    cuf?: string | null;
  };
  warnings: string[];
  errorMessage?: string;
}

export interface ProcessPdfsResponse {
  results: PdfProcessingResult[];
  total: number;
  completed: number;
  errors: number;
}

export interface AiStatus {
  ia: {
    enabled: boolean;
    provider: string;
    model: string;
    configured: boolean;
    version: string;
  };
  modo: {
    dbType: string;
    appMode: 'ONLINE' | 'OFFLINE';
    isOnline: boolean;
    isOffline: boolean;
    usesServiceLayer: boolean;
    isValidConfiguration: boolean;
  };
}

export interface SugerirClasificacionRequest {
  concepto: string;
  monto: number;
  proveedor?: string;
  usuarioId?: string;
  idRendicion?: number;
  idPerfil?: number;
}

export interface CuentaSugerida {
  id: string;
  codigo: string;
  nombre: string;
  confianza: number;
}

export interface DimensionSugerida {
  id: string;
  codigo: string;
  nombre: string;
  confianza: number;
}

export interface NormaSugerida {
  idNorma: number;
  descripcion: string;
  confianza: number;
}

export interface ProyectoSugerido {
  id: string;
  codigo: string;
  nombre: string;
  confianza: number;
}

export interface ClasificacionSugeridaResponse {
  modo: 'ONLINE' | 'OFFLINE';
  cuentaContable: CuentaSugerida;
  dimension1?: DimensionSugerida;
  norma?: NormaSugerida;
  proyecto?: ProyectoSugerido | null;
  razon: string;
  fuenteDatos: 'sap_service_layer' | 'postgres_local';
  timestamp: string;
}

export interface ValidacionSiatResult {
  valido: boolean;
  estadoSIAT: string;
  datosSIAT: {
    nit: string;
    numero: string;
    cuf: string;
    fecha: string;
    monto: number;
    estado: string;
    razonSocial?: string;
  };
  datosPDF: {
    nit?: string;
    numeroFactura?: string;
    fecha?: string;
    monto?: number;
  };
  discrepancias: {
    campo: string;
    pdf: string | number;
    siat: string | number;
    explicacion: string;
  }[];
  recomendacion: string;
  riesgo: 'bajo' | 'medio' | 'alto';
}

export interface AnalisisAprobacionResult {
  idRendicion: number;
  modo: 'ONLINE' | 'OFFLINE';
  scoreRiesgo: number;
  nivel: 'bajo' | 'medio' | 'alto';
  recomendacion: 'aprobar' | 'rechazar' | 'revisar';
  justificacion: string;
  factoresPositivos: string[];
  factoresRiesgo: string[];
  analisisSolicitante: {
    nombre: string;
    rendicionesPrevias: number;
    tasaAprobacion: number;
    montoPromedio: number;
    antiguedadMeses: number;
  };
  analisisMontos: {
    montoActual: number;
    montoPromedioUsuario: number;
    variacionPorcentaje: number;
    esAnormal: boolean;
  };
  alertas: string[];
  datosSAP?: {
    presupuestoDisponible?: number;
    presupuestoConsumido?: number;
  } | null;
}

/**
 * Servicio para funcionalidades de Inteligencia Artificial
 * 
 * IMPORTANTE: Todas las funcionalidades verifican si IA está habilitada
 * Si no lo está, se muestra notificación al usuario invitando a activarla
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly apiUrl = `${environment.apiUrl}/ai`;
  
  // Estado de IA (cacheado)
  private aiStatusSubject = new BehaviorSubject<AiStatus | null>(null);
  public aiStatus$ = this.aiStatusSubject.asObservable();
  
  // Indicador de carga de operaciones IA
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  
  // Mensaje actual de operación IA
  private mensajeIASubject = new BehaviorSubject<string>('');
  public mensajeIA$ = this.mensajeIASubject.asObservable();

  constructor(private http: HttpClient) {
    // Cargar estado de IA al inicializar el servicio
    this.cargarStatus();
  }

  /**
   * Verifica si la IA está habilitada y configurada
   */
  get estaHabilitada(): boolean {
    return this.aiStatusSubject.value?.ia?.enabled === true &&
           this.aiStatusSubject.value?.ia?.configured === true;
  }

  /**
   * Obtiene el estado actual de IA
   */
  get status(): AiStatus | null {
    return this.aiStatusSubject.value;
  }

  /**
   * Carga el estado de IA desde el backend
   */
  cargarStatus(): Observable<AiStatus> {
    return this.http.get<AiStatus>(`${this.apiUrl}/status`).pipe(
      tap(status => {
        this.aiStatusSubject.next(status);
        console.log('🤖 Estado de IA:', status);
      }),
      catchError(error => {
        console.error('Error cargando estado de IA:', error);
        this.aiStatusSubject.next(null);
        return of({
          ia: { enabled: false, provider: '', model: '', configured: false, version: '' },
          modo: { dbType: 'HANA', appMode: 'ONLINE', isOnline: true, isOffline: false, usesServiceLayer: true, isValidConfiguration: true }
        } as AiStatus);
      }),
      shareReplay(1)
    );
  }

  /**
   * Sugiere clasificación contable para un gasto
   * Solo funciona si IA está habilitada
   */
  sugerirClasificacion(request: SugerirClasificacionRequest): Observable<ClasificacionSugeridaResponse | null> {
    if (!this.estaHabilitada) {
      console.warn('🤖 IA no habilitada - No se puede sugerir clasificación');
      return of(null);
    }

    this.setLoading(true, 'Analizando gasto con IA...');

    return this.http.post<ClasificacionSugeridaResponse>(
      `${this.apiUrl}/sugerir-clasificacion`, 
      request
    ).pipe(
      tap(response => {
        console.log('🤖 Sugerencia de IA:', response);
        this.setLoading(false);
      }),
      catchError(error => {
        console.error('Error obteniendo sugerencia de IA:', error);
        this.setLoading(false);
        return of(null);
      })
    );
  }

  /**
   * Muestra notificación al usuario sobre disponibilidad de IA
   * Llama a esto cuando el usuario intenta usar una función IA pero no está habilitada
   */
  mostrarNotificacionDisponibilidad(): void {
    // Esta función será implementada con el toast service
    // Por ahora solo logueamos
    console.log('🤖 IA no habilitada - Mostrar notificación al usuario');
  }

  /**
   * Verifica si IA está habilitada (para compatibilidad con factura.service)
   * @deprecated Usar la propiedad `estaHabilitada` directamente
   */
  isEnabled(): Observable<boolean> {
    return this.cargarStatus().pipe(
      map(status => status.ia.enabled && status.ia.configured),
      catchError(() => of(false))
    );
  }

  /**
   * Procesa múltiples PDFs con IA
   * @param files Archivos PDF a procesar
   */
  processPdfs(files: File[]): Observable<ProcessPdfsResponse> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    return this.http.post<ProcessPdfsResponse>(
      `${this.apiUrl}/process-pdfs`,
      formData
    ).pipe(
      catchError(error => {
        console.error('Error procesando PDFs:', error);
        throw error;
      })
    );
  }

  /**
   * Valida una factura contra el SIAT
   * @param cuf Código Único de Factura
   * @param datosPdf Datos extraídos del PDF para comparar
   */
  validarSiat(
    cuf: string,
    datosPdf?: {
      nit?: string;
      numeroFactura?: string;
      fecha?: string;
      monto?: number;
    }
  ): Observable<ValidacionSiatResult> {
    this.setLoading(true, 'Validando con SIAT...');

    return this.http.post<ValidacionSiatResult>(
      `${this.apiUrl}/validar-siat`,
      { cuf, datosPdf }
    ).pipe(
      tap(() => this.setLoading(false)),
      catchError(error => {
        console.error('Error validando con SIAT:', error);
        this.setLoading(false);
        throw error;
      })
    );
  }

  /**
   * Analiza una rendición para asistir al aprobador
   */
  analizarRendicion(idRendicion: number, usuarioId?: string): Observable<AnalisisAprobacionResult | null> {
    if (!this.estaHabilitada) {
      console.warn('🤖 IA no habilitada - No se puede analizar rendición');
      return of(null);
    }
    this.setLoading(true, 'Analizando rendición con IA...');
    let url = `${this.apiUrl}/analisis-rendicion/${idRendicion}`;
    if (usuarioId) url += `?usuarioId=${usuarioId}`;
    return this.http.get<AnalisisAprobacionResult>(url).pipe(
      tap(() => this.setLoading(false)),
      catchError(error => {
        console.error('Error analizando rendición:', error);
        this.setLoading(false);
        return of(null);
      })
    );
  }

  /**
   * Chatbot - Procesa una consulta conversacional
   */
  chat(params: {
    mensaje: string;
    historial?: { rol: string; contenido: string }[];
    usuarioId?: string;
    paginaActual?: string;
  }): Observable<{ mensaje: string; tipo: string; sugerencias: string[] } | null> {
    if (!this.estaHabilitada) {
      return of({
        mensaje: 'Las funcionalidades de IA no están habilitadas. Contacta al administrador.',
        tipo: 'texto',
        sugerencias: ['¿Cómo activar IA?', 'Contactar soporte']
      });
    }
    this.setLoading(true, 'Procesando consulta...');
    return this.http.post<{ mensaje: string; tipo: string; sugerencias: string[] }>(
      `${this.apiUrl}/chat`, params
    ).pipe(
      tap(() => this.setLoading(false)),
      catchError(() => {
        this.setLoading(false);
        return of({
          mensaje: 'Lo siento, hubo un error. Inténtalo de nuevo.',
          tipo: 'texto',
          sugerencias: ['¿Cuánto he gastado?', 'Crear rendición']
        });
      })
    );
  }

  /**
   * Establece estado de carga y mensaje
   */
  private setLoading(loading: boolean, mensaje = ''): void {
    this.loadingSubject.next(loading);
    this.mensajeIASubject.next(mensaje);
  }

  /**
   * Obtiene texto descriptivo del modo de operación
   */
  getModoDescripcion(): string {
    const modo = this.status?.modo;
    if (!modo) return 'Desconocido';
    
    if (modo.isOnline) {
      return `Online (${modo.dbType} + SAP Service Layer)`;
    } else {
      return 'Offline (PostgreSQL local)';
    }
  }
}
