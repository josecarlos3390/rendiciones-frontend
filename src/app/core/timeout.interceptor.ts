import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * HTTP Timeout Interceptor
 * 
 * Adds a timeout to all HTTP requests to prevent indefinite hanging.
 * Configurable via environment.requestTimeout (default: 30s)
 * 
 * To skip timeout for a specific request, add header:
 *   { headers: { 'X-Skip-Timeout': 'true' } }
 */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const timeoutMs = environment.requestTimeout || 30000;
  
  // Allow specific requests to skip timeout
  if (req.headers.has('X-Skip-Timeout')) {
    const cleanReq = req.clone({ headers: req.headers.delete('X-Skip-Timeout') });
    return next(cleanReq);
  }

  return next(req).pipe(
    timeout(timeoutMs),
    catchError(err => {
      // Enhance timeout error with meaningful message
      if (err.name === 'TimeoutError') {
        const timeoutError = new Error(
          `La solicitud tardó demasiado tiempo (>${timeoutMs}ms). ` +
          'Por favor intenta de nuevo.'
        );
        timeoutError.name = 'HttpTimeoutError';
        return throwError(() => timeoutError);
      }
      return throwError(() => err);
    })
  );
};
