import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';

/**
 * Dumb Component: Header de la página de integración
 * Muestra título, subtítulo según rol y botón de actualizar
 */
@Component({
  selector: 'app-integracion-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CrudPageHeaderComponent],
  template: `
    <app-crud-page-header
      title="Integración ERP"
      [subtitle]="isAdmin ? 'Rendiciones aprobadas pendientes de sincronización con el sistema contable' : 'Mis rendiciones aprobadas y sincronizadas con el sistema contable'"
      actionLabel="↺ Actualizar"
      (actionClick)="refresh.emit()">
    </app-crud-page-header>
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
