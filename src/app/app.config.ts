import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth/auth.interceptor';
import { httpErrorInterceptor } from './core/http-error.interceptor';
import { AppConfigService } from './services/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        httpErrorInterceptor,
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