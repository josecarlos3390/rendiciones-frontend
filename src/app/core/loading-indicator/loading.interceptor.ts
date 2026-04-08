import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingIndicatorService } from './loading-indicator.service';
import { finalize } from 'rxjs/operators';

/**
 * Interceptor que muestra loading indicator durante peticiones HTTP
 * Ignora peticiones de corta duración (ej: health checks)
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingIndicatorService);
  
  // Ignorar health checks y algunos endpoints específicos
  if (req.url.includes('/health') || req.headers.has('X-Skip-Loading')) {
    return next(req);
  }

  loadingService.show();
  
  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
