import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container" *ngIf="toasts().length > 0">
      <div 
        class="toast"
        *ngFor="let toast of toasts()"
        [class.toast-success]="toast.tipo === 'success'"
        [class.toast-error]="toast.tipo === 'error'"
        [class.toast-warning]="toast.tipo === 'warning'"
        [class.toast-info]="toast.tipo === 'info'"
        (click)="cerrar(toast.id)"
        role="alert"
      >
        <!-- Icono -->
        <div class="toast-icon">
          <svg *ngIf="toast.tipo === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <svg *ngIf="toast.tipo === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg *ngIf="toast.tipo === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg *ngIf="toast.tipo === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>

        <!-- Mensaje -->
        <div class="toast-content">
          <span class="toast-message">{{ toast.mensaje }}</span>
        </div>

        <!-- Botón cerrar -->
        <button class="toast-close" (click)="cerrar(toast.id); $event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Barra de progreso -->
        <div class="toast-progress" [style.animation-duration.ms]="toast.duracion"></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 450px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      background: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1);
      border-left: 4px solid;
      min-width: 300px;
      max-width: 450px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      animation: slideInRight 0.3s ease-out;
      transition: all 0.2s ease;
    }
    
    .toast:hover {
      transform: translateX(-4px);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
    }

    /* Tipos de toast */
    .toast-success {
      border-left-color: #10b981;
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
    }
    .toast-success .toast-icon { color: #10b981; }

    .toast-error {
      border-left-color: #ef4444;
      background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
    }
    .toast-error .toast-icon { color: #ef4444; }

    .toast-warning {
      border-left-color: #f59e0b;
      background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
    }
    .toast-warning .toast-icon { color: #f59e0b; }

    .toast-info {
      border-left-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
    }
    .toast-info .toast-icon { color: #3b82f6; }

    .toast-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }

    .toast-icon svg {
      width: 100%;
      height: 100%;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-message {
      font-size: 14px;
      font-weight: 500;
      color: #1f2937;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-line; /* Respeta saltos de línea \n */
    }

    .toast-close {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      padding: 0;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      opacity: 0.6;
      transition: all 0.2s ease;
    }

    .toast-close:hover {
      opacity: 1;
      color: #4b5563;
      transform: rotate(90deg);
    }

    .toast-close svg {
      width: 100%;
      height: 100%;
    }

    /* Barra de progreso */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: currentColor;
      opacity: 0.3;
      animation: progress linear forwards;
    }

    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .toast-container {
        left: 16px;
        right: 16px;
        top: 16px;
        max-width: none;
      }

      .toast {
        min-width: auto;
        max-width: none;
      }
    }
  `]
})
export class ToastComponent {
  private toastService = inject(ToastService);
  toasts = this.toastService.toasts$;

  cerrar(id: string): void {
    this.toastService.eliminar(id);
  }
}
