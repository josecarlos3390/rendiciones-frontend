import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Botón con estado de carga integrado
 * Muestra un spinner cuando está cargando y deshabilita el botón
 * 
 * Uso:
 * <app-loading-button
 *   [loading]="isSaving"
 *   [disabled]="form.invalid"
 *   type="primary"
 *   (clicked)="guardar()">
 *   Guardar
 * </app-loading-button>
 */
@Component({
  selector: 'app-loading-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="buttonType"
      [disabled]="loading || disabled"
      [class]="buttonClasses"
      (click)="onClick($event)">
      
      <!-- Spinner de carga -->
      <span class="btn-spinner" *ngIf="loading">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="3" stroke-linecap="round" 
                  stroke-dasharray="31.416" stroke-dashoffset="10">
            <animateTransform attributeName="transform" type="rotate" 
                              from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </span>
      
      <!-- Texto del botón -->
      <span class="btn-text" [class.invisible]="loading">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    button {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s ease;
      min-width: 100px;
    }
    
    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    /* Variantes de color */
    .btn-primary {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
      border-color: #2563eb;
    }
    
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border-color: #d1d5db;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #e5e7eb;
    }
    
    .btn-danger {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
    }
    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }
    
    .btn-success {
      background: #10b981;
      color: white;
      border-color: #10b981;
    }
    .btn-success:hover:not(:disabled) {
      background: #059669;
    }
    
    .btn-outline {
      background: transparent;
      color: #3b82f6;
      border-color: #3b82f6;
    }
    .btn-outline:hover:not(:disabled) {
      background: #eff6ff;
    }
    
    /* Spinner */
    .btn-spinner {
      position: absolute;
      width: 18px;
      height: 18px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .btn-spinner svg {
      width: 100%;
      height: 100%;
    }
    
    /* Texto invisible durante carga */
    .invisible {
      opacity: 0;
    }
    
    /* Tamaños */
    :host(.btn-sm) button {
      padding: 6px 12px;
      font-size: 12px;
      min-width: 80px;
    }
    :host(.btn-sm) .btn-spinner {
      width: 14px;
      height: 14px;
    }
    
    :host(.btn-lg) button {
      padding: 14px 28px;
      font-size: 16px;
      min-width: 140px;
    }
    :host(.btn-lg) .btn-spinner {
      width: 22px;
      height: 22px;
    }
    
    /* Block (ancho completo) */
    :host(.btn-block) {
      display: block;
      width: 100%;
    }
    :host(.btn-block) button {
      width: 100%;
    }
  `]
})
export class LoadingButtonComponent {
  @Input() loading = false;
  @Input() disabled = false;
  @Input() type: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' = 'primary';
  @Input() buttonType: 'button' | 'submit' | 'reset' = 'button';
  @Output() clicked = new EventEmitter<Event>();

  get buttonClasses(): string {
    return `btn-${this.type}`;
  }

  onClick(event: Event): void {
    if (!this.loading && !this.disabled) {
      this.clicked.emit(event);
    }
  }
}
