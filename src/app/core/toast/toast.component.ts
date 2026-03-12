import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast toast--{{ toast.type }}"
          role="alert"
          (click)="toastService.dismiss(toast.id)"
        >
          <span class="toast__icon">{{ icon(toast.type) }}</span>
          <span class="toast__message">{{ toast.message }}</span>
          <button
            class="toast__close"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Cerrar notificación">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: calc(100vw - 48px);
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 420px;
      padding: 12px 16px;
      border-radius: var(--radius-md);
      border-left: 4px solid transparent;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-left-width: 4px;
      box-shadow: var(--shadow-md);
      font-size: 14px;
      font-family: var(--font-body);
      color: var(--text-body);
      pointer-events: all;
      cursor: pointer;
      animation: toast-in 0.22s cubic-bezier(0.34, 1.3, 0.64, 1);
      transition: opacity var(--transition), transform var(--transition);
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(20px) scale(0.95); }
      to   { opacity: 1; transform: translateX(0)    scale(1);    }
    }

    /* ── Variantes de tipo — usan los tokens de status ── */
    .toast--success {
      border-left-color: var(--status-closed-border);
      background: var(--status-closed-bg);
      color: var(--status-closed-color);
      border-color: var(--status-closed-border);
    }

    .toast--error {
      border-left-color: var(--status-cancelled-border);
      background: var(--status-cancelled-bg);
      color: var(--status-cancelled-color);
      border-color: var(--status-cancelled-border);
    }

    .toast--warning {
      border-left-color: var(--status-confirmed-border);
      background: var(--status-confirmed-bg);
      color: var(--status-confirmed-color);
      border-color: var(--status-confirmed-border);
    }

    .toast--info {
      border-left-color: var(--status-open-border);
      background: var(--status-open-bg);
      color: var(--status-open-color);
      border-color: var(--status-open-border);
    }

    .toast__icon {
      font-size: 16px;
      flex-shrink: 0;
      line-height: 1;
    }

    .toast__message {
      flex: 1;
      line-height: 1.45;
      font-weight: 500;
    }

    .toast__close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 12px;
      opacity: 0.5;
      padding: 2px 4px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
      color: inherit;
      font-family: var(--font-body);
      transition: opacity var(--transition), background var(--transition);

      &:hover { opacity: 1; background: rgba(0,0,0,0.06); }
      &:focus-visible { outline: none; box-shadow: var(--focus-ring); opacity: 1; }
    }

    @media (max-width: 480px) {
      .toast-container { bottom: 16px; right: 16px; left: 16px; max-width: none; }
      .toast { min-width: 0; max-width: none; width: 100%; }
    }
  `],
})
export class ToastComponent {
  toastService = inject(ToastService);

  icon(type: string): string {
    return { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] ?? 'ℹ';
  }
}