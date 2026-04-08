import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { timeoutInterceptor } from './core/timeout.interceptor';
import { httpErrorInterceptor } from './core/http-error.interceptor';
import { loadingInterceptor } from './core/loading-indicator/loading.interceptor';
import { AppConfigService } from './services/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,        // Add auth token
        timeoutInterceptor,     // Add request timeout (30s default)
        loadingInterceptor,     // Show loading indicator
        httpErrorInterceptor,   // Handle errors globally
      ])
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: (appConfigService: AppConfigService) => () => appConfigService.load(),
      deps: [AppConfigService],
      multi: true,
    },
  ],
};
