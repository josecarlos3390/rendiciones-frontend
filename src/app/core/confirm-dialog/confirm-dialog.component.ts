import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'primary' | 'warning' | 'danger';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="dialog-backdrop" (click)="onCancel()">
        <div class="dialog-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true"
          [attr.aria-labelledby]="'dialog-title-' + _uid">

          <div class="dialog-icon dialog-icon--{{ config.type ?? 'primary' }}">
            {{ iconFor(config.type) }}
          </div>

          <h3 class="dialog-title" [id]="'dialog-title-' + _uid">{{ config.title }}</h3>
          <p class="dialog-message">{{ config.message }}</p>

          <div class="dialog-actions">
            <button
              type="button"
              class="btn btn-ghost"
              (click)="onCancel()">{{ config.cancelLabel ?? 'Cancelar' }}</button>

            <button
              type="button"
              class="btn"
              [class.btn-primary]="(config.type ?? 'primary') === 'primary'"
              [class.btn-warning]="config.type === 'warning'"
              [class.btn-danger]="config.type === 'danger'"
              (click)="onConfirm()">{{ config.confirmLabel ?? 'Confirmar' }}</button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
      animation: dialog-fade 0.15s ease;
    }

    @keyframes dialog-fade {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .dialog-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl);
      box-shadow: var(--shadow-modal);
      padding: 32px 28px 24px;
      width: 100%;
      max-width: 400px;
      text-align: center;
      animation: dialog-pop 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
    }

    @keyframes dialog-pop {
      from { opacity: 0; transform: scale(0.93) translateY(10px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);    }
    }

    .dialog-icon {
      font-size: 36px;
      margin-bottom: 12px;
      line-height: 1;
    }

    .dialog-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-heading);
      margin: 0 0 8px;
      font-family: var(--font-body);
    }

    .dialog-message {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0 0 24px;
      line-height: 1.55;
      font-family: var(--font-body);
    }

    .dialog-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }

    /* Botones — usan el sistema global pero los redefinimos aquí
       porque este componente usa encapsulación de estilos (inline styles) */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 9px 22px;
      border-radius: var(--radius-md);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      font-family: var(--font-body);
      transition: opacity var(--transition), background var(--transition);

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-ghost {
      background: var(--bg-subtle);
      color: var(--text-body);
      border-color: var(--border-color);
      &:hover { background: var(--bg-faint); border-color: var(--border-color); }
    }

    .btn-primary {
      background: var(--color-primary);
      color: #fff;
      &:hover:not(:disabled) { opacity: 0.9; }
    }

    .btn-warning {
      background: var(--color-warning);
      color: #fff;
      &:hover:not(:disabled) { opacity: 0.9; }
    }

    .btn-danger {
      background: var(--color-danger);
      color: #fff;
      &:hover:not(:disabled) { opacity: 0.9; }
    }

    @media (max-width: 480px) {
      .dialog-card { padding: 24px 20px 20px; }
      .dialog-actions .btn { flex: 1; }
    }
  `],
})
export class ConfirmDialogComponent {
  @Input() config!: ConfirmDialogConfig;
  @Input() visible = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  // ID único para aria-labelledby
  _uid = Math.random().toString(36).slice(2, 7);

  onConfirm() { this.confirmed.emit(); }
  onCancel()  { this.cancelled.emit(); }

  iconFor(type?: string): string {
    return { primary: '💾', warning: '⚠️', danger: '🗑️' }[type ?? 'primary'] ?? '❓';
  }
}
