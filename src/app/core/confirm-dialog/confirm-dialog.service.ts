import { Injectable, signal } from '@angular/core';
import { ConfirmDialogConfig } from './confirm-dialog.component';

export interface ConfirmDialogState {
  config: ConfirmDialogConfig;
  resolve: (result: boolean) => void;
}

/**
 * Servicio imperativo para mostrar el ConfirmDialog desde cualquier componente.
 *
 * Uso:
 *   const ok = await this.confirm.ask({
 *     title:        '¿Cancelar pedido?',
 *     message:      'Esta acción no se puede deshacer.',
 *     confirmLabel: 'Sí, cancelar',
 *     type:         'danger',
 *   });
 *   if (ok) { ... }
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  // El AppComponent o el LayoutComponent escucha este signal y renderiza el dialog
  readonly state = signal<ConfirmDialogState | null>(null);

  ask(config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({ config, resolve });
    });
  }

  resolve(result: boolean) {
    const current = this.state();
    if (current) {
      current.resolve(result);
      this.state.set(null);
    }
  }
}
