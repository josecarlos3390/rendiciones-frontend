/**
 * NormasTableComponent - Tabla de normas
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge';
import { NormaConDimension } from '@models/norma.model';

@Component({
  selector: 'app-normas-table',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, PaginatorComponent, StatusBadgeComponent],
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th class="col-hide-tablet">Dimensión</th>
            <th class="text-center">Estado</th>
            <th class="col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let norma of items" [class.inactive-row]="!norma.activa">
            <!-- Código -->
            <td data-label="Código">
              <span class="code-tag">{{ norma.factorCode }}</span>
            </td>
            
            <!-- Nombre: Título principal -->
            <td class="col-mobile-primary" data-label="Nombre">{{ norma.descripcion }}</td>
            
            <!-- Dimensión (oculto en móvil) -->
            <td class="col-hide-tablet" data-label="Dimensión">{{ norma.dimensionName || '—' }}</td>
            
            <!-- Estado -->
            <td class="text-center col-mobile-badge" data-label="Estado">
              <app-status-badge [type]="norma.activa ? 'success' : 'neutral'" [dot]="true">
                {{ norma.activa ? 'Activa' : 'Inactiva' }}
              </app-status-badge>
            </td>
            
            <!-- Acciones -->
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActions(norma)"
                (actionClick)="onAction($event, norma)">
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
    
    /* Móvil: Ocultar thead */
    @media (max-width: 640px) {
      .data-table thead { display: none; }
      .col-hide-tablet { display: none !important; }
    }
  `],
})
export class NormasTableComponent {
  @Input() items: NormaConDimension[] = [];
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() isReadonly = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<NormaConDimension>();
  @Output() delete = new EventEmitter<NormaConDimension>();

  getActions(norma: NormaConDimension): ActionMenuItem[] {
    if (this.isReadonly) return [];
    return [
      { id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
      { id: 'delete', label: 'Eliminar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', cssClass: 'text-danger' },
    ];
  }

  onAction(actionId: string | ActionMenuItem, norma: NormaConDimension): void {
    const id = typeof actionId === 'string' ? actionId : actionId.id;
    if (id === 'edit') this.edit.emit(norma);
    if (id === 'delete') this.delete.emit(norma);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
}
