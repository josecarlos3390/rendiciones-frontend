import { Injectable, signal } from '@angular/core';

/**
 * Servicio para mostrar indicador de carga global
 * Usado durante navegación entre páginas y operaciones largas
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingIndicatorService {
  private loading = signal<boolean>(false);
  readonly isLoading = this.loading.asReadonly();

  private pendingRequests = 0;

  show(): void {
    this.pendingRequests++;
    this.loading.set(true);
  }

  hide(): void {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests === 0) {
      this.loading.set(false);
    }
  }

  forceHide(): void {
    this.pendingRequests = 0;
    this.loading.set(false);
  }
}
