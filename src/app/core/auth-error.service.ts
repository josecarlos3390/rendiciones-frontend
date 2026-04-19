import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth/auth.service';
import { ToastService } from './toast/toast.service';

/**
 * Centraliza el manejo de errores de autenticación (401).
 *
 * Extrae la bandera `isHandling401` del scope de módulo del interceptor
 * para que sea SSR-safe: al estar en un servicio `providedIn: 'root'`,
 * cada request server-side tiene su propia instancia y no hay estado
 * compartido entre usuarios.
 */
@Injectable({ providedIn: 'root' })
export class AuthErrorService {
  private isHandling401 = false;

  private toast  = inject(ToastService);
  private auth   = inject(AuthService);
  private router = inject(Router);

  /**
   * Maneja un error 401. Si ya se está procesando uno, no hace nada
   * para evitar múltiples redirects por requests concurrentes.
   *
   * @param isLoginAttempt - true si el error vino del endpoint de login
   *   (en ese caso no hay que redirigir, el componente muestra el error)
   */
  handle(isLoginAttempt: boolean): void {
    if (isLoginAttempt || this.isHandling401) return;

    this.isHandling401 = true;

    this.toast.warning('Tu sesión expiró. Por favor ingresa de nuevo.');
    this.auth.logout();

    this.router.navigate(['/login']).then(() => {
      setTimeout(() => {
        this.isHandling401 = false;
      }, 100);
    });
  }
}