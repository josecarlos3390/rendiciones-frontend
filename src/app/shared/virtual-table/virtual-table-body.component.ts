import { Component, Input, ContentChild, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

/**
 * Componente de tabla con virtual scroll para el tbody
 * Mantiene el thead estático y solo virtualiza las filas de datos
 * Compatible con paginación existente
 * 
 * Uso:
 * <table class="data-table">
 *   <thead>
 *     <tr>
 *       <th>Columna 1</th>
 *       <th>Columna 2</th>
 *     </tr>
 *   </thead>
 *   <app-virtual-table-body [items]="paged" [itemHeight]="56">
 *     <ng-template #rowTemplate let-item>
 *       <tr>
 *         <td>{{ item.col1 }}</td>
 *         <td>{{ item.col2 }}</td>
 *       </tr>
 *     </ng-template>
 *   </app-virtual-table-body>
 * </table>
 */
@Component({
  selector: 'app-virtual-table-body',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tbody class="virtual-tbody">
      <cdk-virtual-scroll-viewport
        [itemSize]="itemHeight"
        [minBufferPx]="itemHeight * 3"
        [maxBufferPx]="itemHeight * 8"
        [style.height.px]="viewportHeight"
        class="virtual-scroll-viewport">
        
        <tr 
          *cdkVirtualFor="let item of items; trackBy: trackByFn"
          class="virtual-row"
          [style.height.px]="itemHeight">
          <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: item }"></ng-container>
        </tr>

        <!-- Empty state dentro del viewport para mantener altura -->
        <tr *ngIf="items.length === 0" class="virtual-row empty-row" [style.height.px]="itemHeight">
          <td [attr.colspan]="colspan" class="empty-cell">
            No hay datos para mostrar
          </td>
        </tr>
      </cdk-virtual-scroll-viewport>
    </tbody>
  `,
  styles: [`
    :host {
      display: table-row-group;
    }

    .virtual-tbody {
      display: block;
    }

    .virtual-scroll-viewport {
      width: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      display: block;
    }

    .virtual-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s ease;
    }

    .virtual-row:hover {
      background-color: #f9fafb;
    }

    .virtual-row:last-child {
      border-bottom: none;
    }

    .empty-row {
      background: transparent !important;
    }

    .empty-cell {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }

    /* Scrollbar styling */
    .virtual-scroll-viewport::-webkit-scrollbar {
      width: 8px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    .virtual-scroll-viewport::-webkit-scrollbar-thumb:hover {
      background: #a1a1a1;
    }

    /* Firefox scrollbar */
    .virtual-scroll-viewport {
      scrollbar-width: thin;
      scrollbar-color: #c1c1c1 #f1f1f1;
    }

    /* Dark mode support */
    :host-context([data-theme="dark"]) .virtual-row {
      border-bottom-color: #374151;
    }

    :host-context([data-theme="dark"]) .virtual-row:hover {
      background-color: #374151;
    }

    :host-context([data-theme="dark"]) .empty-cell {
      color: #9ca3af;
    }

    :host-context([data-theme="dark"]) .virtual-scroll-viewport::-webkit-scrollbar-track {
      background: #374151;
    }

    :host-context([data-theme="dark"]) .virtual-scroll-viewport::-webkit-scrollbar-thumb {
      background: #6b7280;
    }

    :host-context([data-theme="dark"]) .virtual-scroll-viewport::-webkit-scrollbar-thumb:hover {
      background: #9ca3af;
    }
  `]
})
export class VirtualTableBodyComponent<T> {
  @Input() items: T[] = [];
  @Input() itemHeight = 56;
  @Input() maxItems = 20; // Cuántos items mostrar antes de scroll
  @Input() colspan = 1;
  @Input() trackByFn: (index: number, item: T) => any = (index) => index;

  @ContentChild('rowTemplate', { static: false }) rowTemplate!: TemplateRef<{ $implicit: T }>;

  get viewportHeight(): number {
    // Limita la altura máxima basada en maxItems
    const calculatedHeight = Math.min(this.items.length, this.maxItems) * this.itemHeight;
    // Altura mínima para empty state
    return Math.max(calculatedHeight, this.itemHeight);
  }
}
