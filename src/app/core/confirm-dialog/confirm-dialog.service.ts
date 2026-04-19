import { Injectable, signal } from '@angular/core';
import { ConfirmDialogConfig } from './confirm-dialog.component';

export interface ConfirmDialogState {
  config: ConfirmDialogConfig;
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private _state = signal<ConfirmDialogState | null>(null);

  /** Estado reactivo del diálogo de confirmación (usado por layout.component.html) */
  state = this._state.asReadonly();

  /**
   * Muestra un diálogo de confirmación y devuelve una Promise<boolean>.
   * Usado desde componentes/smart components.
   */
  ask(config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this._state.set({ config, resolve });
    });
  }

  /**
   * Resuelve el diálogo actual con true/false y lo cierra.
   * Usado por el componente global de confirmación.
   */
  resolve(result: boolean): void {
    const current = this._state();
    if (current) {
      current.resolve(result);
      this._state.set(null);
    }
  }
}
