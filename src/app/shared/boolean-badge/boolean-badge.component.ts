import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Badge Sí/No o Activo/Inactivo estandarizado.
 *
 * Uso:
 * <app-boolean-badge [value]="c.asociada" trueLabel="Sí" falseLabel="No" />
 * <app-boolean-badge [value]="c.activa" variant="active" />
 */
@Component({
  selector: 'app-boolean-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class.badge-primary]="value" [class.badge-secondary]="!value">
      {{ value ? trueLabel : falseLabel }}
    </span>
  `,
})
export class BooleanBadgeComponent {
  @Input() value = false;
  @Input() trueLabel = 'Sí';
  @Input() falseLabel = 'No';
}
