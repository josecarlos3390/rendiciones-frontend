/**
 * Virtual Table Component
 * 
 * Componente wrapper que aplica virtual scrolling de Angular CDK a tablas grandes.
 * Mejora el rendimiento cuando hay muchos registros (>50) al renderizar solo
 * las filas visibles en el viewport.
 * 
 * Uso:
 * <app-virtual-table [items]="documentos" [itemHeight]="48" [minBufferPx]="200">
 *   <ng-template #rowTemplate let-item let-index="index">
 *     <tr>...</tr>
 *   </ng-template>
 * </app-virtual-table>
 */

import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  Input,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'app-virtual-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="virtual-table-container"
      [class.with-border]="withBorder"
      [style.height.px]="containerHeight"
    >
      <cdk-virtual-scroll-viewport
        [itemSize]="itemHeight"
        [minBufferPx]="minBufferPx"
        [maxBufferPx]="maxBufferPx"
        class="virtual-scroll-viewport"
      >
        <table class="data-table virtual-data-table" [class]="tableClass">
          <ng-content select="[tableHeader]"></ng-content>
          <tbody>
            <ng-container *cdkVirtualFor="
              let item of items;
              let index = index;
              let first = first;
              let last = last;
              let odd = odd;
              let even = even;
              trackBy: trackByFn
            ">
              <ng-container
                *ngTemplateOutlet="
                  rowTemplate || defaultRowTemplate;
                  context: {
                    $implicit: item,
                    index: index,
                    first: first,
                    last: last,
                    odd: odd,
                    even: even
                  }
                "
              ></ng-container>
            </ng-container>
          </tbody>
          <ng-content select="[tableFooter]"></ng-content>
        </table>
      </cdk-virtual-scroll-viewport>
    </div>

    <!-- Template por defecto (debe ser sobreescrito) -->
    <ng-template #defaultRowTemplate let-item let-index="index">
      <tr>
        <td [attr.colspan]="999">
          <em style="color: #888; padding: 12px; display: block;">
            Define un template con: &lt;ng-template #rowTemplate let-item&gt;...
          </em>
        </td>
      </tr>
    </ng-template>
  `,
  styles: [`
    .virtual-table-container {
      position: relative;
      overflow: hidden;
    }

    .virtual-table-container.with-border {
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-lg, 8px);
    }

    .virtual-scroll-viewport {
      height: 100%;
      width: 100%;
    }

    /* Ajustes para la tabla dentro del viewport virtual */
    .virtual-data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    /* Estilos para las filas virtuales */
    .virtual-data-table tbody tr {
      height: var(--row-height, 48px);
      box-sizing: border-box;
    }

    /* Header sticky dentro del viewport */
    .virtual-data-table thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--bg-tertiary, #f1f5f9);
    }

    /* Footer sticky al final */
    .virtual-data-table tfoot {
      position: sticky;
      bottom: 0;
      z-index: 10;
      background: var(--bg-primary, #ffffff);
    }

    /* Scrollbar styling */
    .virtual-scroll-viewport::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-track {
      background: var(--bg-secondary, #f8fafc);
      border-radius: 4px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-thumb {
      background: var(--border-color, #cbd5e1);
      border-radius: 4px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted, #94a3b8);
    }
  `],
})
export class VirtualTableComponent<T = any> {
  /** Items a renderizar en la tabla */
  @Input() items: T[] = [];

  /** Altura de cada fila en píxeles (default: 48) */
  @Input() itemHeight = 48;

  /** Altura del contenedor en píxeles (default: 400) */
  @Input() containerHeight = 400;

  /** Buffer mínimo en píxeles para pre-rendering (default: 200) */
  @Input() minBufferPx = 200;

  /** Buffer máximo en píxeles para pre-rendering (default: 400) */
  @Input() maxBufferPx = 400;

  /** Clase CSS adicional para la tabla */
  @Input() tableClass = '';

  /** Mostrar borde alrededor del contenedor */
  @Input() withBorder = true;

  /** TrackBy function para optimizar re-renders */
  @Input() trackByFn: (index: number, item: T) => any = (index, item) => index;

  /** Template para cada fila */
  @ContentChild('rowTemplate', { static: false })
  rowTemplate!: TemplateRef<any>;
}
