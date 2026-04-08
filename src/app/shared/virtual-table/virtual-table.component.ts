import { Component, Input, Output, EventEmitter, TemplateRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

/**
 * Tabla con virtual scroll para grandes volúmenes de datos
 * Renderiza solo las filas visibles, mejorando performance
 * 
 * Uso:
 * <app-virtual-table
 *   [items]="rendiciones"
 *   [itemHeight]="56"
 *   [maxHeight]="500">
 *   <ng-template #rowTemplate let-item>
 *     <tr>
 *       <td>{{ item.id }}</td>
 *       <td>{{ item.nombre }}</td>
 *     </tr>
 *   </ng-template>
 * </app-virtual-table>
 */
@Component({
  selector: 'app-virtual-table',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="virtual-table-container" [style.max-height.px]="maxHeight">
      <!-- Header fijo -->
      <div class="virtual-table-header" *ngIf="headerTemplate">
        <ng-container *ngTemplateOutlet="headerTemplate"></ng-container>
      </div>

      <!-- Cuerpo con virtual scroll -->
      <cdk-virtual-scroll-viewport
        [itemSize]="itemHeight"
        [minBufferPx]="itemHeight * 5"
        [maxBufferPx]="itemHeight * 10"
        class="virtual-scroll-viewport">
        
        <div 
          *cdkVirtualFor="let item of items; trackBy: trackByFn"
          class="virtual-table-row"
          [style.height.px]="itemHeight"
          (click)="onRowClick(item)">
          <ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: item }"></ng-container>
        </div>

        <!-- Empty state -->
        <div *ngIf="items.length === 0" class="virtual-table-empty">
          <ng-container *ngIf="emptyTemplate; else defaultEmpty">
            <ng-container *ngTemplateOutlet="emptyTemplate"></ng-container>
          </ng-container>
          <ng-template #defaultEmpty>
            <div class="empty-message">No hay datos para mostrar</div>
          </ng-template>
        </div>
      </cdk-virtual-scroll-viewport>
    </div>
  `,
  styles: [`
    .virtual-table-container {
      display: flex;
      flex-direction: column;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }

    .virtual-table-header {
      flex-shrink: 0;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      font-size: 13px;
      color: #4b5563;
      padding: 12px 16px;
    }

    .virtual-scroll-viewport {
      flex: 1;
      overflow-y: auto;
    }

    .virtual-table-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #f3f4f6;
      transition: background-color 0.15s ease;
      cursor: pointer;
    }

    .virtual-table-row:hover {
      background-color: #f9fafb;
    }

    .virtual-table-row:last-child {
      border-bottom: none;
    }

    .virtual-table-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #6b7280;
    }

    .empty-message {
      font-size: 14px;
    }

    /* Estilos para el scrollbar */
    .virtual-scroll-viewport::-webkit-scrollbar {
      width: 8px;
      height: 8px;
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
  `]
})
export class VirtualTableComponent<T> {
  @Input() items: T[] = [];
  @Input() itemHeight = 56;
  @Input() maxHeight = 500;
  @Input() trackByFn: (index: number, item: T) => any = (index) => index;

  // Templates
  @Input() headerTemplate?: TemplateRef<any>;
  @Input() rowTemplate!: TemplateRef<{ $implicit: T }>;
  @Input() emptyTemplate?: TemplateRef<any>;

  @Output() rowClick = new EventEmitter<T>();

  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }
}
