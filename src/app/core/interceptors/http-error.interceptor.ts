import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpStatusCode,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastService } from '../toast/toast.service';

/**
 * Interceptor HTTP global para manejo estandarizado de errores.
 * 
 * Características:
 * - Muestra mensajes de error automáticos según el código HTTP
 * - Maneja 401 (no autorizado) redirigiendo al login
 * - Maneja 403 (prohibido) con mensaje específico
 * - Maneja errores de red (sin conexión)
 * - Loggea errores en consola para debugging
 * - Permite skip de interceptor por request (header X-Skip-Error-Handling)
 */

export interface HttpErrorContext {
  /** Mensaje personalizado para mostrar en caso de error */
  customMessage?: string;
  /** Si es true, no muestra toast de error (el componente lo maneja) */
  skipToast?: boolean;
  /** Si es true, no redirige al login en 401 */
  skipAuthRedirect?: boolean;
  /** Retry automático en errores de red */
  retryCount?: number;
}

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  
  // Mensajes por código HTTP
  private readonly errorMessages: Record<number, string> = {
    [HttpStatusCode.BadRequest]: 'Solicitud inválida. Verifique los datos enviados.',
    [HttpStatusCode.Unauthorized]: 'Sesión expirada. Por favor inicie sesión nuevamente.',
    [HttpStatusCode.Forbidden]: 'No tiene permisos para realizar esta acción.',
    [HttpStatusCode.NotFound]: 'El recurso solicitado no existe.',
    [HttpStatusCode.Conflict]: 'Hay un conflicto con los datos. El recurso ya existe.',
    [HttpStatusCode.UnprocessableEntity]: 'Datos inválidos. Revise los campos e intente nuevamente.',
    [HttpStatusCode.TooManyRequests]: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.',
    [HttpStatusCode.InternalServerError]: 'Error interno del servidor. Contacte al administrador.',
    [HttpStatusCode.BadGateway]: 'Error de comunicación con el servidor. Intente más tarde.',
    [HttpStatusCode.ServiceUnavailable]: 'Servicio no disponible. Intente más tarde.',
    [HttpStatusCode.GatewayTimeout]: 'Tiempo de espera agotado. Intente nuevamente.',
  };

  // Mensajes para errores de red
  private readonly networkErrorMessage = 'Sin conexión a internet. Verifique su conexión e intente nuevamente.';
  private readonly defaultErrorMessage = 'Ocurrió un error inesperado. Intente nuevamente.';

  constructor(
    private toast: ToastService,
    private router: Router,
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Verificar si se debe saltar el manejo de errores
    if (request.headers.has('X-Skip-Error-Handling')) {
      const newRequest = request.clone({
        headers: request.headers.delete('X-Skip-Error-Handling')
      });
      return next.handle(newRequest);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error, request);
        return throwError(() => error);
      })
    );
  }

  /**
   * Maneja el error HTTP según su código y contexto
   */
  private handleError(error: HttpErrorResponse, request: HttpRequest<unknown>): void {
    // Loggear error para debugging
    this.logError(error, request);

    // Obtener contexto del error si existe
    const context = this.getErrorContext(error);
    
    if (context.skipToast) {
      return;
    }

    // Manejar errores de red (0 = no hay conexión)
    if (error.status === 0) {
      this.toast.error(this.networkErrorMessage);
      return;
    }

    // Manejar 401 - No autorizado
    if (error.status === HttpStatusCode.Unauthorized) {
      this.handleUnauthorized(context.skipAuthRedirect);
      return;
    }

    // Manejar 403 - Prohibido
    if (error.status === HttpStatusCode.Forbidden) {
      this.toast.error(this.errorMessages[HttpStatusCode.Forbidden]);
      return;
    }

    // Usar mensaje personalizado si existe
    if (context.customMessage) {
      this.toast.error(context.customMessage);
      return;
    }

    // Intentar obtener mensaje del backend
    const backendMessage = this.getBackendErrorMessage(error);
    if (backendMessage) {
      this.toast.error(backendMessage);
      return;
    }

    // Usar mensaje por código HTTP o default
    const message = this.errorMessages[error.status] || this.defaultErrorMessage;
    this.toast.error(message);
  }

  /**
   * Maneja error 401 (no autorizado)
   */
  private handleUnauthorized(skipRedirect: boolean = false): void {
    this.toast.error(this.errorMessages[HttpStatusCode.Unauthorized]);
    
    if (!skipRedirect) {
      // Limpiar token y redirigir a login
      localStorage.removeItem('token');
      // Navegar a login después de un momento para que se vea el toast
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }
  }

  /**
   * Extrae mensaje de error del backend si existe
   */
  private getBackendErrorMessage(error: HttpErrorResponse): string | null {
    // Intentar diferentes estructuras comunes de respuesta de error
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.error?.error) {
      return error.error.error;
    }

    if (typeof error.error === 'string' && error.error.length > 0) {
      return error.error;
    }

    // Errores de validación (array de mensajes)
    if (Array.isArray(error.error?.errors) && error.error.errors.length > 0) {
      return error.error.errors.join(', ');
    }

    if (Array.isArray(error.error?.messages) && error.error.messages.length > 0) {
      return error.error.messages.join(', ');
    }

    return null;
  }

  /**
   * Obtiene el contexto del error desde headers o error object
   */
  private getErrorContext(error: HttpErrorResponse): HttpErrorContext {
    // El contexto puede venir en un header personalizado o en el error
    const context: HttpErrorContext = {};

    // Intentar obtener desde el error (si fue agregado por un servicio)
    if ((error as any).context) {
      Object.assign(context, (error as any).context);
    }

    return context;
  }

  /**
   * Loggea el error en consola para debugging
   */
  private logError(error: HttpErrorResponse, request: HttpRequest<unknown>): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      method: request.method,
      url: request.url,
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      message: error.message,
    };

    if (error.status >= 500) {
      console.error('[HTTP Error]', logData);
    } else if (error.status >= 400) {
      console.warn('[HTTP Error]', logData);
    } else {
      console.log('[HTTP Error]', logData);
    }
  }
}

/**
 * Helper para agregar contexto a requests HTTP
 * Uso:
 * this.http.get('/api/data', {
 *   context: setErrorContext({ skipToast: true })
 * })
 */
export function setErrorContext(context: HttpErrorContext): { [key: string]: HttpErrorContext } {
  return { httpErrorContext: context };
}
