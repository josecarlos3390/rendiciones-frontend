import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CuentaCOA } from '@models/coa.model';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';

@Component({
  selector: 'app-coa-table',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, PaginatorComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th class="col-hide-tablet">Format Code</th>
            <th class="text-center col-hide-mobile">Asociada</th>
            <th class="text-center">Estado</th>
            <th class="col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let c of items" [class.inactive-row]="!c.activa">
            <!-- Código -->
            <td data-label="Código">
              <span class="code-tag">{{ c.code }}</span>
            </td>
            
            <!-- Nombre: Título principal en móvil -->
            <td class="col-mobile-primary" data-label="Nombre">{{ c.name }}</td>
            
            <!-- Format Code (oculto en móvil) -->
            <td class="col-hide-tablet" data-label="Format Code">{{ c.formatCode || '—' }}</td>
            
            <!-- Asociada (oculto en móvil pequeño) -->
            <td class="text-center col-hide-mobile col-mobile-badge" data-label="Asociada">
              <span class="badge" [class.badge-primary]="c.asociada" [class.badge-secondary]="!c.asociada">
                {{ c.asociada ? 'Sí' : 'No' }}
              </span>
            </td>
            
            <!-- Estado -->
            <td class="text-center col-mobile-badge" data-label="Estado">
              <app-status-badge [type]="c.activa ? 'success' : 'neutral'" [dot]="true">
                {{ c.activa ? 'Activa' : 'Inactiva' }}
              </app-status-badge>
            </td>
            
            <!-- Acciones -->
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                *ngIf="canEdit"
                [actions]="getActionMenuItems(c)"
                (actionClick)="onActionClick($event, c)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>

      <app-paginator
        [page]="page"
        [limit]="limit"
        [total]="total"
        [totalPages]="totalPages"
        (pageChange)="onPageChange($event)"
        (limitChange)="onLimitChange($event)">
      </app-paginator>
    </div>
  `,
  styles: [`
    :host { display: block; }
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
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }
    .badge-primary {
      background: var(--color-primary-bg);
      color: var(--color-primary-text);
    }
    .badge-secondary {
      background: var(--bg-subtle);
      color: var(--text-secondary);
    }
    
    /* Móvil: Ocultar thead, usar clases globales del sistema */
    @media (max-width: 640px) {
      .data-table thead { display: none; }
      .col-hide-mobile { display: none !important; }
    }
    @media (max-width: 768px) {
      .col-hide-tablet { display: none !important; }
    }
  `]
})
export class CoaTableComponent {
  @Input() items: CuentaCOA[] = [];
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() canEdit = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<CuentaCOA>();
  @Output() delete = new EventEmitter<CuentaCOA>();

  getActionMenuItems(c: CuentaCOA): ActionMenuItem[] {
    if (!this.canEdit) return [];
    return [
      { id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
      { id: 'delete', label: 'Eliminar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', cssClass: 'text-danger' },
    ];
  }

  onActionClick(actionId: string, c: CuentaCOA): void {
    if (actionId === 'edit') this.edit.emit(c);
    if (actionId === 'delete') this.delete.emit(c);
  }

  onPageChange(page: number): void { this.pageChange.emit(page); }
  onLimitChange(limit: number): void { this.limitChange.emit(limit); }
}
