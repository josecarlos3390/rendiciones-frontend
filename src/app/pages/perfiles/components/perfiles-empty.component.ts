import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-perfiles-empty',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" *ngIf="loading">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10" stroke-dasharray="4 4"/>
          <path d="M12 6v6l4 2"/>
        </svg>
      </div>
      <p>Cargando perfiles...</p>
    </div>

    <div class="empty-state" *ngIf="!loading && error">
      <div class="empty-icon empty-icon--error">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p>No se pudo cargar la lista de perfiles.</p>
      <a class="empty-action" (click)="onRetry()">Reintentar</a>
    </div>

    <div class="empty-state" *ngIf="!loading && !error && count === 0">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <p>No hay perfiles registrados.</p>
      <a *ngIf="canCreate" class="empty-action" (click)="onCreate()">Crear el primero</a>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }

    .empty-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: var(--radius-lg);
      background: var(--bg-faint);
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .empty-icon--error {
      color: var(--color-danger);
      background: var(--color-danger-bg);
    }

    .empty-state p {
      margin: 0 0 12px;
      font-size: var(--text-base);
      color: var(--text-secondary);
    }

    .empty-action {
      color: var(--color-primary);
      font-weight: var(--weight-medium);
      cursor: pointer;
      text-decoration: none;
      transition: color 0.15s;
    }

    .empty-action:hover {
      color: var(--color-primary-hover);
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .empty-state {
        padding: 32px 16px;
      }

      .empty-icon {
        width: 56px;
        height: 56px;
      }
    }
  `]
})
export class PerfilesEmptyComponent {
  @Input() loading = false;
  @Input() error = false;
  @Input() count = 0;
  @Input() canCreate = false;

  @Output() retry = new EventEmitter<void>();
  @Output() create = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }

  onCreate(): void {
    this.create.emit();
  }
}
