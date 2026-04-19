import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast/toast.service';
import { AuthErrorService } from './auth-error.service';

/**
 * Extrae y formatea mensajes de error del backend.
 * Soporta:
 *   - String simple: "Error message"
 *   - Array de strings: ["Error 1", "Error 2"]
 *   - Objeto con message: { message: "..." } o { message: ["...", "..."] }
 */
function extractErrorMessages(error: unknown): string[] {
  if (!error) return [];
  const err = error as Record<string, unknown>;
  if (Array.isArray(err['message'])) return err['message'].map((m: unknown) => String(m));
  if (typeof err['message'] === 'string' && err['message'].trim()) return [err['message']];
  if (typeof error === 'string' && error.trim()) return [error];
  if (Array.isArray(error)) {
    return error
      .map((e: unknown) =>
        typeof e === 'string' ? e : ((e as Record<string, unknown>)?.['message'] || String(e))
      )
      .filter(Boolean) as string[];
  }
  if (err['error']) {
    if (typeof err['error'] === 'string') return [err['error']];
    if (Array.isArray(err['error'])) return (err['error'] as unknown[]).map(String);
    if ((err['error'] as Record<string, unknown>)?.['message']) return extractErrorMessages(err['error']);
  }
  return [];
}

function formatValidationErrors(messages: string[]): string {
  if (messages.length === 0) return 'Error de validación. Verifica los datos ingresados.';
  if (messages.length === 1) return messages[0];
  const maxMessages = 3;
  const displayMessages = messages.slice(0, maxMessages);
  const remainingCount = messages.length - maxMessages;
  let formatted = displayMessages.map(m => `• ${m}`).join('\n');
  if (remainingCount > 0) {
    formatted += `\n• ...y ${remainingCount} error${remainingCount > 1 ? 'es' : ''} más`;
  }
  return formatted;
}

/**
 * Interceptor global de errores HTTP.
 *
 * Maneja automáticamente:
 *   0   → Sin conexión al servidor
 *   400 → Bad request / Validación → mensaje del backend (soporta arrays)
 *   401 → Token expirado → logout y redirige a login (vía AuthErrorService)
 *   403 → Sin permisos → toast informativo
 *   408/timeout → Request timeout → mensaje específico
 *   422 → Validación → mensajes de error del backend
 *   5xx → Error del servidor → mensaje genérico
 *
 * NO maneja (el componente es responsable):
 *   409 → Conflicto de negocio — siempre tiene un mensaje específico del backend
 *   404 → No encontrado — el componente decide cómo reaccionar en su contexto
 *
 * Para suprimir el manejo global en una petición específica, agregar el header:
 *   { headers: { 'X-Skip-Error-Handler': 'true' } }
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast     = inject(ToastService);
  const authError = inject(AuthErrorService);

  if (req.headers.has('X-Skip-Error-Handler')) {
    const cleanReq = req.clone({ headers: req.headers.delete('X-Skip-Error-Handler') });
    return next(cleanReq);
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse | Error) => {
      if (err.name === 'HttpTimeoutError') {
        toast.error(err.message || 'La solicitud tardó demasiado tiempo.');
        return throwError(() => err);
      }

      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      const messages   = extractErrorMessages(err.error);
      const backendMsg = messages[0] || err.error?.detail;

      switch (true) {
        case err.status === 0:
          toast.error('Sin conexión con el servidor. Verifica tu red.');
          break;

        case err.status === 400:
          toast.error(messages.length > 0 ? formatValidationErrors(messages) : backendMsg || 'La solicitud contiene datos inválidos.');
          break;

        case err.status === 422:
          toast.error(messages.length > 0 ? formatValidationErrors(messages) : backendMsg || 'Error de validación. Verifica los datos ingresados.');
          break;

        case err.status === 401:
          authError.handle(req.url.includes('/auth/login'));
          break;

        case err.status === 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;

        case err.status === 408:
          toast.error('El servidor tardó demasiado en responder. Intenta de nuevo.');
          break;

        case err.status >= 500:
          toast.error(backendMsg || 'Error en el servidor. Intenta de nuevo en unos momentos.');
          break;

        default:
          break;
      }

      return throwError(() => err);
    })
  );
};