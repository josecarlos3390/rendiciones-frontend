import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface NotificacionEvent {
  tipo: 'APROBACION_PROCESADA' | 'RENDICION_SINCRONIZADA' | 'RENDICION_RECHAZADA';
  idRendicion: number;
  timestamp: number;
}

/**
 * Servicio de notificaciones en tiempo real entre componentes.
 * 
 * Permite comunicación inmediata sin depender del polling (60s).
 * Casos de uso:
 * - Cuando se aprueba/rechaza una rendición → actualizar contadores sidebar
 * - Cuando se sincroniza una rendición → actualizar contador integración
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private notificacionSubject = new Subject<NotificacionEvent>();

  /** Observable público para suscribirse a notificaciones */
  public notificaciones$: Observable<NotificacionEvent> = this.notificacionSubject.asObservable();

  /**
   * Emite una notificación de que se procesó una aprobación.
   * Llamar después de aprobar/rechazar exitosamente una rendición.
   */
  emitirAprobacionProcesada(idRendicion: number): void {
    this.notificacionSubject.next({
      tipo: 'APROBACION_PROCESADA',
      idRendicion,
      timestamp: Date.now(),
    });
  }

  /**
   * Emite una notificación de que se sincronizó una rendición.
   * Llamar después de sincronizar exitosamente con SAP.
   */
  emitirRendicionSincronizada(idRendicion: number): void {
    this.notificacionSubject.next({
      tipo: 'RENDICION_SINCRONIZADA',
      idRendicion,
      timestamp: Date.now(),
    });
  }

  /**
   * Emite una notificación de que se rechazó una rendición.
   */
  emitirRendicionRechazada(idRendicion: number): void {
    this.notificacionSubject.next({
      tipo: 'RENDICION_RECHAZADA',
      idRendicion,
      timestamp: Date.now(),
    });
  }
}
