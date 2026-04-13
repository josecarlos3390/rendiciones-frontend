/**
 * TipoCambioTableComponent - Tabla de tasas de cambio
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge';
import { TipoCambio } from '@services/tipo-cambio.service';

@Component({
  selector: 'app-tipo-cambio-table',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, PaginatorComponent, StatusBadgeComponent],
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-mobile-primary">Fecha</th>
            <th>Moneda</th>
            <th class="text-right">Tasa (BOB)</th>
            <th class="text-center">Estado</th>
            <th class="col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let tasa of items" [class.inactive-row]="tasa.activo !== 'Y'">
            <td class="col-mobile-primary" data-label="Fecha">{{ tasa.fecha | date:'dd/MM/yyyy' }}</td>
            <td data-label="Moneda">
              <span class="code-tag">{{ tasa.moneda }}</span>
            </td>
            <td class="text-right col-mono" data-label="Tasa (BOB)">{{ formatTasa(tasa.tasa) }}</td>
            <td class="text-center" data-label="Estado">
              <app-status-badge [type]="tasa.activo === 'Y' ? 'success' : 'neutral'" [dot]="true">
                {{ tasa.activo === 'Y' ? 'Activo' : 'Inactivo' }}
              </app-status-badge>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActions(tasa)"
                itemLabel="tasa de cambio"
                (actionClick)="onAction($event, tasa)">
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
    .table-wrapper {
      overflow-x: auto;
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
        transition: background 0.15s;

        &:hover {
          background: var(--bg-faint);
        }

        &.inactive-row {
          opacity: 0.7;
        }
      }

      .text-right { text-align: right; }
      .text-center { text-align: center; }

      .col-mono {
        font-family: var(--font-mono);
      }

      .col-acciones {
        width: 60px;
        text-align: right;
      }
    }

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
export class TipoCambioTableComponent {
  @Input() items: TipoCambio[] = [];
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() isReadonly = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<TipoCambio>();
  @Output() delete = new EventEmitter<TipoCambio>();
  @Output() toggle = new EventEmitter<TipoCambio>();

  formatTasa(tasa: number): string {
    return tasa.toFixed(4);
  }

  getActions(tasa: TipoCambio): ActionMenuItem[] {
    if (this.isReadonly) return [];
    
    return [
      { id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' },
      { id: 'toggle', label: tasa.activo === 'Y' ? 'Desactivar' : 'Activar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>' },
      { id: 'delete', label: 'Eliminar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', cssClass: 'text-danger' },
    ];
  }

  onAction(actionId: string | ActionMenuItem, tasa: TipoCambio): void {
    const id = typeof actionId === 'string' ? actionId : actionId.id;
    
    switch (id) {
      case 'edit':
        this.edit.emit(tasa);
        break;
      case 'delete':
        this.delete.emit(tasa);
        break;
      case 'toggle':
        this.toggle.emit(tasa);
        break;
    }
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }
}
