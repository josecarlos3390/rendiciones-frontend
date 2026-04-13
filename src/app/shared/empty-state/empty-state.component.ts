import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingButtonComponent } from '../loading-button/loading-button.component';

/**
 * Componente de estado vacío amigable
 * Muestra un mensaje visual cuando no hay datos
 * 
 * Uso:
 * <app-empty-state
 *   icon="folder"
 *   title="No hay rendiciones"
 *   message="Comienza creando tu primera rendición"
 *   [showAction]="true"
 *   actionText="Nueva Rendición"
 *   (action)="crearNueva()">
 * </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, LoadingButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" [class.compact]="compact">
      <!-- Icono -->
      <div class="empty-icon" [class]="'icon-' + icon">
        <svg *ngIf="icon === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
        </svg>
        <svg *ngIf="icon === 'document'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <svg *ngIf="icon === 'search'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <svg *ngIf="icon === 'inbox'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
        </svg>
        <svg *ngIf="icon === 'check'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <svg *ngIf="icon === 'users'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        <svg *ngIf="icon === 'chart'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2v-6"/>
        </svg>
      </div>

      <!-- Título -->
      <h3 class="empty-title">{{ title }}</h3>

      <!-- Mensaje descriptivo -->
      <p class="empty-message" *ngIf="message">{{ message }}</p>

      <!-- Acción opcional -->
      <div class="empty-action" *ngIf="showAction">
        <app-loading-button
          [loading]="actionLoading"
          type="primary"
          (clicked)="onAction()">
          {{ actionText }}
        </app-loading-button>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
    }

    .empty-state.compact {
      padding: 32px 24px;
    }

    .empty-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    .empty-icon svg {
      width: 40px;
      height: 40px;
    }

    /* Colores por tipo de icono */
    .icon-folder { background: #eff6ff; color: #3b82f6; }
    .icon-document { background: #f0fdf4; color: #10b981; }
    .icon-search { background: #fef3c7; color: #f59e0b; }
    .icon-inbox { background: #f3f4f6; color: #6b7280; }
    .icon-check { background: #d1fae5; color: #059669; }
    .icon-users { background: #ede9fe; color: #7c3aed; }
    .icon-chart { background: #fce7f3; color: #db2777; }

    .compact .empty-icon {
      width: 56px;
      height: 56px;
    }

    .compact .empty-icon svg {
      width: 28px;
      height: 28px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px 0;
    }

    .compact .empty-title {
      font-size: 16px;
    }

    .empty-message {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 24px 0;
      max-width: 320px;
      line-height: 1.5;
    }

    .compact .empty-message {
      font-size: 13px;
      margin-bottom: 16px;
    }

    .empty-action {
      margin-top: 8px;
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: 'folder' | 'document' | 'search' | 'inbox' | 'check' | 'users' | 'chart' = 'folder';
  @Input() title = 'No hay elementos';
  @Input() message = '';
  @Input() showAction = false;
  @Input() actionText = 'Crear nuevo';
  @Input() actionLoading = false;
  @Input() compact = false;
  @Output() action = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }
}
