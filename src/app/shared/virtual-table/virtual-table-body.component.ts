import {
  Component,
  Input,
  ContentChild,
  TemplateRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de tabla body - Renderiza filas de tabla con ngFor
 * 
 * NOTA: Versión simplificada sin virtual scroll (temporal)
 * El host usa display: contents para que las filas se integren directamente
 * en la tabla padre sin crear contenedres intermedios.
 */
@Component({
  selector: 'app-virtual-table-body',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Filas de datos - se integran directamente en el tbody padre -->
    <ng-container *ngFor="let item of items; let index = index; trackBy: trackByFn">
      <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: item, index: index }"></ng-container>
    </ng-container>

    <!-- Empty state -->
    <tr *ngIf="items.length === 0" class="virtual-empty-row">
      <td [attr.colspan]="colspan" class="virtual-empty-cell">
        {{ emptyMessage }}
      </td>
    </tr>
  `,
  styles: [`
    :host {
      /* display: contents hace que el host desaparezca del DOM visual,
         y sus hijos se integren directamente en el padre (tbody) */
      display: contents;
    }

    /* Empty state */
    .virtual-empty-row {
      display: table-row;
      background: transparent !important;
    }

    .virtual-empty-cell {
      text-align: center;
      padding: 20px !important;
      color: var(--text-muted, #6b7280);
      font-size: 14px;
    }

    /* Dark mode support */
    :host-context([data-theme="dark"]) .virtual-empty-cell {
      color: var(--text-muted-dark, #9ca3af);
    }
  `],
})
export class VirtualTableBodyComponent<T> implements OnChanges {
  /** Items a renderizar */
  @Input() items: T[] = [];

  /** Altura de cada fila en píxeles (default: 56) - NO USADO en versión simple */
  @Input() itemHeight = 56;

  /** Número de columnas para colspan del empty state (requerido) */
  @Input() colspan = 1;

  /** Cuántos items mostrar antes de activar scroll (default: 15) - NO USADO */
  @Input() maxItems = 15;

  /** Buffer mínimo en píxeles - NO USADO en versión simple */
  @Input() minBufferPx = 280;

  /** Buffer máximo en píxeles - NO USADO en versión simple */
  @Input() maxBufferPx = 560;

  /** Mensaje cuando no hay items */
  @Input() emptyMessage = 'No hay datos para mostrar';

  /** TrackBy function para optimizar re-renders */
  @Input() trackByFn: (index: number, _item: T) => any = (index, _item) => index;

  @ContentChild('rowTemplate', { static: false })
  rowTemplate!: TemplateRef<{ $implicit: T; index: number }>;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      const prev = changes['items'].previousValue?.length ?? 0;
      const curr = changes['items'].currentValue?.length ?? 0;
      console.log(`[virtual-table] items cambiados: ${prev} → ${curr}`);
      this.cdr.markForCheck();
    }
  }
}
