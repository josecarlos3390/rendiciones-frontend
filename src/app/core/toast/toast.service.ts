import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  mensaje: string;
  tipo: ToastType;
  duracion: number;
}

/**
 * Servicio de notificaciones toast
 * Muestra mensajes temporales en la esquina superior derecha
 * 
 * Uso:
 * toastService.exito('Operación completada');
 * toastService.error('No se pudo guardar');
 * toastService.info('Sincronizando...', 5000);
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  readonly toasts$ = this.toasts.asReadonly();

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Muestra un toast genérico
   */
  mostrar(mensaje: string, tipo: ToastType = 'info', duracion: number = 3000): void {
    const toast: Toast = {
      id: this.generateId(),
      mensaje,
      tipo,
      duracion
    };

    this.toasts.update(current => [...current, toast]);

    // Auto-eliminar después de la duración
    if (duracion > 0) {
      setTimeout(() => this.eliminar(toast.id), duracion);
    }
  }

  /**
   * Toast de éxito
   */
  exito(mensaje: string, duracion: number = 3000): void {
    this.mostrar(mensaje, 'success', duracion);
  }

  /**
   * Toast de error
   */
  error(mensaje: string, duracion: number = 5000): void {
    this.mostrar(mensaje, 'error', duracion);
  }

  /**
   * Toast de advertencia
   */
  advertencia(mensaje: string, duracion: number = 4000): void {
    this.mostrar(mensaje, 'warning', duracion);
  }

  /**
   * Alias en inglés para advertencia
   */
  warning(mensaje: string, duracion: number = 4000): void {
    this.advertencia(mensaje, duracion);
  }

  /**
   * Toast informativo
   */
  info(mensaje: string, duracion: number = 3000): void {
    this.mostrar(mensaje, 'info', duracion);
  }

  /**
   * Elimina un toast específico
   */
  eliminar(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  /**
   * Elimina todos los toasts
   */
  limpiar(): void {
    this.toasts.set([]);
  }
}
