/**
 * ProyectosTableComponent - Tabla de proyectos
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge';
import { Proyecto } from '@models/proyecto.model';

@Component({
  selector: 'app-proyectos-table',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, PaginatorComponent, StatusBadgeComponent],
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-hide-mobile">Código</th>
            <th class="col-mobile-primary">Nombre</th>
            <th class="text-center">Estado</th>
            <th class="col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let proyecto of items" [class.inactive-row]="!proyecto.activo">
            <td class="col-hide-mobile" data-label="Código">
              <span class="code-tag">{{ proyecto.code }}</span>
            </td>
            <td class="col-mobile-primary" data-label="Nombre">{{ proyecto.name }}</td>
            <td class="text-center" data-label="Estado">
              <app-status-badge [type]="proyecto.activo ? 'success' : 'neutral'" [dot]="true">
                {{ proyecto.activo ? 'Activo' : 'Inactivo' }}
              </app-status-badge>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActions(proyecto)"
                (actionClick)="onAction($event, proyecto)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>

      <app-paginator
        [page]="page"
        [totalPages]="totalPages"
        (pageChange)="onPageChange($event)">
      </app-paginator>
    </div>
  `,
  styles: [`
    .table-wrapper { overflow-x: auto; }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }
    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    .data-table th {
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      background: var(--bg-faint);
      text-transform: uppercase;
      font-size: var(--text-xs);
    }
    .data-table tbody tr:hover { background: var(--bg-faint); }
    .data-table tbody tr.inactive-row { opacity: 0.7; }
    .text-center { text-align: center; }
    .col-acciones { width: 60px; text-align: right; }
    .code-tag {
      display: inline-block;
      padding: 2px 8px;
      background: var(--bg-faint);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-family: var(--font-mono);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
    }
  `],
})
export class ProyectosTableComponent {
  @Input() items: Proyecto[] = [];
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() isReadonly = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<Proyecto>();
  @Output() delete = new EventEmitter<Proyecto>();

  getActions(proyecto: Proyecto): ActionMenuItem[] {
    if (this.isReadonly) return [];
    return [
      { id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
      { id: 'delete', label: 'Eliminar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', cssClass: 'text-danger' },
    ];
  }

  onAction(actionId: string | ActionMenuItem, proyecto: Proyecto): void {
    const id = typeof actionId === 'string' ? actionId : actionId.id;
    if (id === 'edit') this.edit.emit(proyecto);
    if (id === 'delete') this.delete.emit(proyecto);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
}
