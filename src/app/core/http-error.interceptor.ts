import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from './toast/toast.service';
import { AuthService } from '../auth/auth.service';

/**
 * Interceptor global de errores HTTP.
 *
 * Maneja automáticamente:
 *   0   → Sin conexión al servidor
 *   400 → Bad request → mensaje del backend si existe
 *   401 → Token expirado o inválido → logout y redirige a login
 *   403 → Sin permisos → toast informativo
 *   5xx → Error del servidor → mensaje genérico
 *
 * NO maneja (el componente es responsable):
 *   409 → Conflicto de negocio — siempre tiene un mensaje específico del backend
 *   422 → Validación — siempre tiene un mensaje específico del backend
 *   404 → No encontrado — el componente decide cómo reaccionar en su contexto
 *
 * El callback error() en los componentes solo debe limpiar estado de UI
 * (ej: isSaving = false). No necesita volver a mostrar un toast para
 * los errores que ya maneja este interceptor (0, 400, 401, 403, 5xx).
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
    catchError((err: HttpErrorResponse) => {
      // Extraer mensaje del backend si existe
      const backendMsg: string | undefined =
        err.error?.message || err.error?.error || err.error?.detail;

      switch (true) {
        // ── Sin conexión ──────────────────────────────────────────
        case err.status === 0:
          toast.error('Sin conexión con el servidor. Verifica tu red.');
          break;

        // ── Bad request ───────────────────────────────────────────
        case err.status === 400:
          toast.error(backendMsg || 'La solicitud contiene datos inválidos.');
          break;

        // ── Token expirado / no autenticado ───────────────────────
        case err.status === 401: {
          // No mostrar toast si es el endpoint de login (credenciales incorrectas)
          const isLoginAttempt = req.url.includes('/auth/login');
          if (!isLoginAttempt) {
            toast.warning('Tu sesión expiró. Por favor ingresa de nuevo.');
            auth.logout();
            router.navigate(['/login']);
          }
          break;
        }

        // ── Sin permisos ──────────────────────────────────────────
        case err.status === 403:
          toast.error('No tienes permisos para realizar esta acción.');
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