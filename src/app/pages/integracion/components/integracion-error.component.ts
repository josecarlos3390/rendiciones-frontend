import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dumb Component: Estado de error
 */
@Component({
  selector: 'app-integracion-error',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      No se pudo cargar. <a (click)="retry.emit()">Reintentar</a>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: var(--text-muted);
      
      a {
        color: var(--color-primary);
        cursor: pointer;
        text-decoration: underline;
        
        &:hover {
          color: var(--color-primary-hover);
        }
      }
    }
    
    @media (max-width: 640px) {
      .empty-state {
        padding: 32px 16px;
      }
    }
  `]
})
export class IntegracionErrorComponent {
  @Output() retry = new EventEmitter<void>();
}
