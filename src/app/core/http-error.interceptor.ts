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
 *   401 → Token expirado o inválido → logout y redirige a login
 *   403 → Sin permisos → toast informativo
 *   404 → Recurso no encontrado → toast (solo para mutaciones, no GETs)
 *   409 → Conflicto (regla de negocio) → mensaje del backend
 *   422 → Validación backend → mensaje del backend
 *   5xx → Error del servidor → mensaje genérico
 *
 * Los componentes ya NO necesitan manejar estos casos individualmente.
 * Solo deben manejar errores con lógica de UI propia (ej: limpiar un spinner).
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
        // ── Sin conexión ─────────────────────────────────────────
        case err.status === 0:
          toast.error('Sin conexión con el servidor. Verifica tu red.');
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

        // ── Conflicto de negocio / validación ─────────────────────
        case err.status === 409:
        case err.status === 422:
          toast.error(backendMsg || 'Los datos enviados no son válidos.');
          break;

        // ── Error del servidor ────────────────────────────────────
        case err.status >= 500:
          toast.error(backendMsg || 'Error en el servidor. Intenta de nuevo en unos momentos.');
          break;

        // ── Otros errores (400, 404, etc.) — dejar que el componente decida ──
        default:
          break;
      }

      // Re-lanzar siempre para que el componente pueda reaccionar (ej: limpiar loading)
      return throwError(() => err);
    })
  );
};
