import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast/toast.service';
import { AuthService } from '@auth/auth.service';

/**
 * Track if we're already handling a 401 to prevent race conditions
 * where multiple concurrent requests fail and each tries to logout
 */
let isHandling401 = false;

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

  // Caso 1: message es un array
  if (Array.isArray(err['message'])) {
    return err['message'].map((m: unknown) => String(m));
  }

  // Caso 2: message es un string
  if (typeof err['message'] === 'string' && err['message'].trim()) {
    return [err['message']];
  }

  // Caso 3: error es un string directo
  if (typeof error === 'string' && error.trim()) {
    return [error];
  }

  // Caso 4: error es un array directo
  if (Array.isArray(error)) {
    return error.map((e: unknown) =>
      typeof e === 'string' ? e : ((e as Record<string, unknown>)?.['message'] || String(e))
    ).filter(Boolean) as string[];
  }

  // Caso 5: propiedad error (algunos backends usan esta estructura)
  if (err['error']) {
    if (typeof err['error'] === 'string') return [err['error']];
    if (Array.isArray(err['error'])) return (err['error'] as unknown[]).map(String);
    if ((err['error'] as Record<string, unknown>)?.['message']) return extractErrorMessages(err['error']);
  }

  return [];
}

/**
 * Formatea mensajes de validación para mostrarlos en toast.
 * Muestra máximo 3 errores para no saturar la pantalla.
 */
function formatValidationErrors(messages: string[]): string {
  if (messages.length === 0) return 'Error de validación. Verifica los datos ingresados.';
  if (messages.length === 1) return messages[0];
  
  // Para múltiples errores, listarlos con viñetas
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
 *   401 → Token expirado o inválido → logout y redirige a login
 *   403 → Sin permisos → toast informativo
 *   408/timeout → Request timeout → mensaje específico
 *   422 → Validación → mensajes de error del backend
 *   5xx → Error del servidor → mensaje genérico
 *
 * NO maneja (el componente es responsable):
 *   409 → Conflicto de negocio — siempre tiene un mensaje específico del backend
 *   404 → No encontrado — el componente decide cómo reaccionar en su contexto
 *
 * El callback error() en los componentes solo debe limpiar estado de UI
 * (ej: isSaving = false). No necesita volver a mostrar un toast para
 * los errores que ya maneja este interceptor (0, 400, 401, 403, 422, 5xx).
 *
 * Para suprimir el manejo global en una petición específica, agregar el header:
 *   { headers: { 'X-Skip-Error-Handler': 'true' } }
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast  = inject(ToastService);
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Permitir que componentes específicos manejen sus propios errores
  if (req.headers.has('X-Skip-Error-Handler')) {
    const cleanReq = req.clone({ headers: req.headers.delete('X-Skip-Error-Handler') });
    return next(cleanReq);
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse | Error) => {
      // Handle timeout errors (from timeoutInterceptor)
      if (err.name === 'HttpTimeoutError') {
        toast.error(err.message || 'La solicitud tardó demasiado tiempo.');
        return throwError(() => err);
      }

      // Handle non-HTTP errors
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      // Extraer mensajes del backend
      const messages = extractErrorMessages(err.error);
      const backendMsg: string | undefined = messages[0] || err.error?.detail;

      switch (true) {
        // ── Sin conexión ──────────────────────────────────────────
        case err.status === 0:
          toast.error('Sin conexión con el servidor. Verifica tu red.');
          break;

        // ── Bad request (400) / Validación ────────────────────────
        case err.status === 400:
          if (messages.length > 0) {
            // Errores de validación del backend (ej: validación de class-validator)
            toast.error(formatValidationErrors(messages));
          } else {
            toast.error(backendMsg || 'La solicitud contiene datos inválidos.');
          }
          break;
          
        // ── Validación (422) ─────────────────────────────────────
        case err.status === 422:
          if (messages.length > 0) {
            toast.error(formatValidationErrors(messages));
          } else {
            toast.error(backendMsg || 'Error de validación. Verifica los datos ingresados.');
          }
          break;

        // ── Token expirado / no autenticado ───────────────────────
        case err.status === 401: {
          // No mostrar toast si es el endpoint de login (credenciales incorrectas)
          const isLoginAttempt = req.url.includes('/auth/login');
          
          if (!isLoginAttempt && !isHandling401) {
            // Prevent multiple concurrent 401s from triggering multiple redirects
            isHandling401 = true;
            
            toast.warning('Tu sesión expiró. Por favor ingresa de nuevo.');
            auth.logout();
            
            // Reset flag after navigation completes
            router.navigate(['/login']).then(() => {
              setTimeout(() => {
                isHandling401 = false;
              }, 100);
            });
          }
          break;
        }

        // ── Sin permisos ──────────────────────────────────────────
        case err.status === 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;

        // ── Request Timeout (server-side) ─────────────────────────
        case err.status === 408:
          toast.error('El servidor tardó demasiado en responder. Intenta de nuevo.');
          break;

        // ── Error del servidor ────────────────────────────────────
        case err.status >= 500:
          toast.error(backendMsg || 'Error en el servidor. Intenta de nuevo en unos momentos.');
          break;

        // ── 404, 409, 422 y otros — el componente decide ──────────
        default:
          break;
      }

      // Re-lanzar siempre para que el componente pueda reaccionar (ej: limpiar loading)
      return throwError(() => err);
    })
  );
};
