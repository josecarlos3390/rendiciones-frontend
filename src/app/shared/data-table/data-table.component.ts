import {
  Component, Input, Output, EventEmitter, ChangeDetectionStrategy, TemplateRef, ContentChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorComponent } from '../paginator/paginator.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu';

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  format?: 'text' | 'number' | 'date' | 'currency' | 'custom';
  formatOptions?: any;
  cellTemplate?: TemplateRef<any>;
  hidden?: boolean;
  mobile?: {
    order?: number;
    fullWidth?: boolean;
    hide?: boolean;
    primary?: boolean;
  };
}

export interface DataTableAction {
  id: string;
  label: string;
  icon?: string;
  cssClass?: string;
  danger?: boolean;
  condition?: (item: any) => boolean;
}

export interface DataTableConfig {
  columns: DataTableColumn[];
  actions?: DataTableAction[];
  showActions?: boolean;
  selectable?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

/**
 * DataTableComponent - Tabla de datos genérica y reutilizable
 * 
 * Características:
 * - Columnas configurables
 * - Acciones por fila con menú desplegable
 * - Paginación integrada
 * - Estados de carga y empty state
 * - Selección de filas
 * - Templates personalizables
 * - Responsive automático (cards en móvil)
 * 
 * Uso básico:
 * <app-data-table
 *   [items]="items"
 *   [columns]="columns"
 *   [loading]="loading"
 *   [page]="page"
 *   [limit]="limit"
 *   [total]="total"
 *   (action)="onAction($event)">
 * </app-data-table>
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    PaginatorComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    ActionMenuComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="data-table-wrapper" [class.bordered]="config.bordered">
      <!-- Loading State -->
      <app-skeleton-loader
        *ngIf="loading"
        variant="table"
        [rows]="skeletonRows"
        [columns]="skeletonColumns">
      </app-skeleton-loader>

      <!-- Empty State -->
      <app-empty-state
        *ngIf="!loading && items.length === 0"
        [icon]="emptyIcon"
        [title]="emptyTitle"
        [message]="emptyMessage">
        <ng-content select="[emptyAction]" *ngIf="showEmptyAction"></ng-content>
      </app-empty-state>

      <!-- Table -->
      <ng-container *ngIf="!loading && items.length > 0">
        <div class="table-scroll-wrapper" [class.compact]="config.compact">
          <table class="data-table" 
                 [class.striped]="config.striped" 
                 [class.hoverable]="config.hoverable"
                 [class.data-table--mobile]="true">
            <thead>
              <tr>
                <!-- Checkbox -->
                <th *ngIf="config.selectable" class="col-checkbox">
                  <input type="checkbox" 
                         [checked]="allSelected"
                         [indeterminate]="someSelected"
                         (change)="toggleAllSelection()">
                </th>

                <!-- Columnas visibles -->
                <th *ngFor="let col of desktopColumns"
                    [class.text-center]="col.align === 'center'"
                    [class.text-right]="col.align === 'right'"
                    [class]="'col-' + col.key"
                    [class.sortable]="col.sortable"
                    (click)="col.sortable && onSort(col.key)">
                  {{ col.header }}
                  <span class="sort-indicator" *ngIf="col.sortable && sortColumn === col.key">
                    {{ sortDirection === 'asc' ? '▲' : '▼' }}
                  </span>
                </th>

                <!-- Acciones -->
                <th *ngIf="config.showActions && config.actions?.length" class="col-actions">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items; let index = index; trackBy: trackByFn"
                  [class.selected]="isSelected(item)">
                
                <!-- Checkbox -->
                <td *ngIf="config.selectable" class="col-checkbox">
                  <input type="checkbox" 
                         [checked]="isSelected(item)"
                         (change)="toggleSelection(item)">
                </td>

                <!-- Celdas de datos con clases móvil -->
                <td *ngFor="let col of visibleColumns"
                    [class]="getCellClasses(col)"
                    [attr.data-label]="col.header">
                  
                  <ng-container *ngIf="col.cellTemplate; else defaultCell">
                    <ng-container *ngTemplateOutlet="col.cellTemplate; context: { $implicit: item, index: index, column: col }"></ng-container>
                  </ng-container>

                  <ng-template #defaultCell>
                    {{ formatValue(getValue(item, col.key), col) }}
                  </ng-template>
                </td>

                <!-- Acciones -->
                <td *ngIf="config.showActions && config.actions?.length" 
                    class="col-actions"
                    data-label="Acciones">
                  <app-action-menu
                    *ngIf="getVisibleActions(item).length > 0"
                    [actions]="getVisibleActions(item)"
                    [itemLabel]="'Item ' + (index + 1)"
                    (actionClick)="onActionClick($event, item)">
                  </app-action-menu>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <app-paginator
          *ngIf="showPaginator"
          [page]="page"
          [limit]="limit"
          [total]="total"
          [totalPages]="totalPages"
          (pageChange)="onPageChange($event)"
          (limitChange)="onLimitChange($event)">
        </app-paginator>
      </ng-container>
    </div>
  `,
  styles: [``]
})
export class DataTableComponent<T = any> {
  @Input() items: T[] = [];
  @Input() loading = false;
  @Input() config: DataTableConfig = { columns: [] };

  // Paginación
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() showPaginator = true;

  // Empty state
  @Input() emptyIcon: 'folder' | 'document' | 'search' | 'inbox' | 'check' | 'users' | 'chart' = 'folder';
  @Input() emptyTitle = 'Sin datos para mostrar';
  @Input() emptyMessage = 'No hay datos para mostrar';
  @Input() showEmptyAction = false;

  // Skeleton
  @Input() skeletonRows = 5;
  @Input() skeletonColumns = ['25%', '20%', '20%', '20%', '15%'];

  // Selección
  @Input() selectedItems: T[] = [];
  @Input() trackByField = 'id';

  // Ordenamiento
  @Input() sortColumn: string | null = null;
  @Input() sortDirection: 'asc' | 'desc' = 'asc';

  // Footer
  @Input() showFooter = false;
  @ContentChild('footerTemplate', { static: false }) footerTemplate?: TemplateRef<any>;

  @Output() action = new EventEmitter<{ action: string; item: T }>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() sort = new EventEmitter<{ column: string; direction: 'asc' | 'desc' }>();
  @Output() selectionChange = new EventEmitter<T[]>();

  trackByFn = (index: number, item: T) => this.getValue(item, this.trackByField) || index;

  get visibleColumns(): DataTableColumn[] {
    return this.config.columns.filter(c => !c.hidden);
  }

  get desktopColumns(): DataTableColumn[] {
    return this.visibleColumns.filter(c => !c.mobile?.hide);
  }

  getCellClasses(col: DataTableColumn): string {
    const classes: string[] = [`col-${col.key}`];
    
    if (col.align === 'center') classes.push('text-center');
    if (col.align === 'right') classes.push('text-right');
    
    // Clases móvil
    if (col.mobile?.fullWidth) {
      classes.push('col-mobile-full');
    } else if (col.mobile?.primary) {
      classes.push('col-mobile-primary');
    } else if (col.mobile?.order) {
      classes.push(`col-mobile-${col.mobile.order}`);
    } else {
      // Default order
      classes.push('col-mobile-2');
    }
    
    if (col.mobile?.hide) {
      classes.push('col-hide-mobile');
    }
    
    return classes.join(' ');
  }

  get totalColumns(): number {
    let count = this.visibleColumns.length;
    if (this.config.selectable) count++;
    if (this.config.showActions && this.config.actions?.length) count++;
    return count;
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this.items.every(item => this.isSelected(item));
  }

  get someSelected(): boolean {
    return this.items.some(item => this.isSelected(item)) && !this.allSelected;
  }

  getValue(item: T, key: string): any {
    return key.split('.').reduce((obj: any, k: string) => obj?.[k], item);
  }

  formatValue(value: any, column: DataTableColumn): string {
    if (value == null) return '—';

    switch (column.format) {
      case 'number':
        return Number(value).toLocaleString('es-ES', column.formatOptions);
      case 'currency':
        return Number(value).toLocaleString('es-ES', {
          style: 'currency',
          currency: 'BOB',
          ...column.formatOptions,
        });
      case 'date':
        return new Date(value).toLocaleDateString('es-ES', column.formatOptions);
      default:
        return String(value);
    }
  }

  getVisibleActions(item: T): ActionMenuItem[] {
    if (!this.config.actions) return [];
    
    return this.config.actions
      .filter(a => !a.condition || a.condition(item))
      .map(a => ({
        id: a.id,
        label: a.label,
        icon: a.icon,
        cssClass: a.cssClass || (a.danger ? 'danger' : ''),
      }));
  }

  onActionClick(actionId: string, item: T): void {
    this.action.emit({ action: actionId, item });
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(limit);
  }

  onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.sort.emit({ column: this.sortColumn, direction: this.sortDirection });
  }

  isSelected(item: T): boolean {
    const value = this.getValue(item, this.trackByField);
    return this.selectedItems.some(i => this.getValue(i, this.trackByField) === value);
  }

  toggleSelection(item: T): void {
    const value = this.getValue(item, this.trackByField);
    const index = this.selectedItems.findIndex(i => this.getValue(i, this.trackByField) === value);
    
    if (index >= 0) {
      this.selectedItems = [...this.selectedItems.slice(0, index), ...this.selectedItems.slice(index + 1)];
    } else {
      this.selectedItems = [...this.selectedItems, item];
    }
    this.selectionChange.emit(this.selectedItems);
  }

  toggleAllSelection(): void {
    if (this.allSelected) {
      this.selectedItems = [];
    } else {
      this.selectedItems = [...this.items];
    }
    this.selectionChange.emit(this.selectedItems);
  }
}
