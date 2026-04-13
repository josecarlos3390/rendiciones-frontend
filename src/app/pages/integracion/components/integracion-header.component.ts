import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dumb Component: Header de la página de integración
 * Muestra título, subtítulo según rol y botón de actualizar
 */
@Component({
  selector: 'app-integracion-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h2>Integración ERP</h2>
        <p class="page-subtitle" *ngIf="isAdmin">
          Rendiciones aprobadas pendientes de sincronización con el sistema contable
        </p>
        <p class="page-subtitle" *ngIf="!isAdmin">
          Mis rendiciones aprobadas y sincronizadas con el sistema contable
        </p>
      </div>
      <button class="btn btn-ghost btn-sm" (click)="refresh.emit()">↺ Actualizar</button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class IntegracionHeaderComponent {
  @Input() isAdmin = false;
  @Output() refresh = new EventEmitter<void>();
}
