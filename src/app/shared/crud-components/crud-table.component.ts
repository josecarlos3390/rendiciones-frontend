/**
 * CrudTableComponent - Tabla reutilizable para CRUDs
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorComponent } from '../paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '../action-menu';
import { LoadingStateComponent } from '../loading-state';

export interface CrudTableColumn<T = any> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  template?: TemplateRef<any>;
  cellTemplate?: TemplateRef<any>;
}

@Component({
  selector: 'app-crud-table',
  standalone: true,
  imports: [CommonModule, PaginatorComponent, ActionMenuComponent, LoadingStateComponent],
  template: `
    <div class="crud-table-container">
      <app-loading-state
        *ngIf="loadingState !== 'success'"
        [state]="loadingState"
        [errorMessage]="errorMessage"
        (retry)="onRetry()">
      </app-loading-state>

      <table *ngIf="loadingState === 'success'" class="data-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns" [style.width]="col.width" [class.text-center]="col.align === 'center'" [class.text-right]="col.align === 'right'">
              {{ col.header }}
            </th>
            <th *ngIf="!isReadonly" class="col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of items; let i = index" (click)="onRowClick(item)">
            <td *ngFor="let col of columns" [class.text-center]="col.align === 'center'" [class.text-right]="col.align === 'right'">
              <ng-container *ngIf="col.cellTemplate; else defaultCell">
                <ng-container *ngTemplateOutlet="col.cellTemplate; context: { $implicit: item, value: getCellValue(item, col.key), row: item, index: i }"></ng-container>
              </ng-container>
              <ng-template #defaultCell>
                {{ getCellValue(item, col.key) }}
              </ng-template>
            </td>
            <td *ngIf="!isReadonly" class="col-actions">
              <app-action-menu
                [actions]="getActionItems(item)"
                (actionClick)="onAction($event, item)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>

      <app-paginator
        *ngIf="showPagination && loadingState === 'success' && items.length > 0"
        [page]="page"
        [totalPages]="totalPages"
        (pageChange)="onPageChange($event)">
      </app-paginator>
    </div>
  `,
  styles: [`
    .crud-table-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);

      th, td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
      }

      th {
        font-weight: var(--weight-semibold);
        color: var(--text-muted);
        background: var(--bg-faint);
        text-transform: uppercase;
        font-size: var(--text-xs);
        letter-spacing: 0.03em;
      }

      tbody tr {
        cursor: pointer;
        transition: background 0.15s;

        &:hover {
          background: var(--bg-faint);
        }
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; }

      .col-actions {
        width: 60px;
        text-align: right;
      }
    }

    @media (max-width: 768px) {
      .data-table {
        display: block;
        overflow-x: auto;
      }
    }
  `],
})
export class CrudTableComponent<T = any> {
  @Input() items: T[] = [];
  @Input() columns: CrudTableColumn<T>[] = [];
  @Input() loadingState: 'idle' | 'loading' | 'success' | 'empty' | 'error' = 'idle';
  @Input() errorMessage = 'Error al cargar datos';
  @Input() isReadonly = false;

  // Pagination
  @Input() showPagination = true;
  @Input() page = 1;
  @Input() totalPages = 1;

  // Actions
  @Input() canEdit = true;
  @Input() canDelete = true;
  @Input() actionItems: ActionMenuItem[] = [];

  @Output() pageChange = new EventEmitter<number>();
  @Output() retry = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<T>();
  @Output() edit = new EventEmitter<T>();
  @Output() delete = new EventEmitter<T>();
  @Output() action = new EventEmitter<{ action: string; item: T }>();

  getCellValue(item: T, key: string): any {
    const keys = key.split('.');
    let value: any = item;
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? '—';
  }

  getActionItems(item: T): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    if (this.canEdit) {
      items.push({ id: 'edit', label: 'Editar', icon: 'edit' });
    }
    if (this.canDelete) {
      items.push({ id: 'delete', label: 'Eliminar', icon: 'trash', cssClass: 'text-danger' });
    }
    return [...items, ...this.actionItems];
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onRetry(): void {
    this.retry.emit();
  }

  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }

  onAction(actionId: string | ActionMenuItem, item: T): void {
    const id = typeof actionId === 'string' ? actionId : actionId.id;
    if (id === 'edit') {
      this.edit.emit(item);
    } else if (id === 'delete') {
      this.delete.emit(item);
    } else {
      this.action.emit({ action: id, item });
    }
  }
}
