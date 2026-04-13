/**
 * Dumb Component: CoaTreeComponent
 * Responsabilidad: Mostrar tabla/árbol de cuentas COA
 * - Recibe cuentas paginadas vía @Input
 * - Emite acciones vía @Output
 * - Sin lógica de negocio, solo presentación
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { CuentaCOA } from '@models/coa.model';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';

export interface CoaTreeAction {
  actionId: string;
  cuenta: CuentaCOA;
}

@Component({
  selector: 'app-coa-tree',
  standalone: true,
  imports: [
    CommonModule,
    PaginatorComponent,
    StatusBadgeComponent,
    ActionMenuComponent,
  ],
  template: `
    <div class="coa-tree">
      <div class="coa-tree__table-wrapper">
        <table class="coa-tree__table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Format</th>
              <th class="text-center">Asociada</th>
              <th class="text-center">Estado</th>
              <th class="coa-tree__actions-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let cuenta of cuentas" 
                [class.inactive-row]="!cuenta.activa"
                class="coa-tree__row">
              <td class="coa-tree__code" data-label="Código">{{ cuenta.code }}</td>
              <td class="coa-tree__name" data-label="Nombre">{{ cuenta.name }}</td>
              <td data-label="Format">{{ cuenta.formatCode || '-' }}</td>
              <td class="text-center" data-label="Asociada">
                <app-status-badge [type]="cuenta.asociada ? 'success' : 'neutral'" [pill]="true">
                  {{ cuenta.asociada ? 'Sí' : 'No' }}
                </app-status-badge>
              </td>
              <td class="text-center" data-label="Estado">
                <app-status-badge [type]="cuenta.activa ? 'success' : 'danger'" [pill]="true">
                  {{ cuenta.activa ? 'Activa' : 'Inactiva' }}
                </app-status-badge>
              </td>
              <td class="coa-tree__actions" data-label="Acciones">
                <app-action-menu
                  *ngIf="isAdmin"
                  [actions]="getActionMenuItems(cuenta)"
                  [itemLabel]="cuenta.code + ' - ' + cuenta.name"
                  (actionClick)="onActionClick($event, cuenta)">
                </app-action-menu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
    :host {
      display: block;
    }

    .coa-tree {
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: var(--radius-lg, 0.5rem);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
      overflow: hidden;
    }

    .coa-tree__table-wrapper {
      overflow-x: auto;
    }

    .coa-tree__table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm, 0.875rem);

      th, td {
        padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
        text-align: left;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }

      th {
        background: var(--bg-subtle, #f9fafb);
        font-weight: 600;
        color: var(--text-secondary, #6b7280);
        text-transform: uppercase;
        font-size: var(--text-xs, 0.75rem);
        letter-spacing: 0.05em;
      }

      tbody tr {
        transition: background-color 0.15s ease;

        &:hover {
          background: var(--bg-muted, #f3f4f6);
        }

        &.inactive-row {
          opacity: 0.6;
          background-color: var(--bg-muted, #f8f9fa);
        }
      }
    }

    .coa-tree__code {
      font-family: var(--font-mono, monospace);
      font-weight: 600;
      color: var(--text-main, #111827);
    }

    .coa-tree__name {
      color: var(--text-main, #111827);
    }

    .coa-tree__actions-header {
      width: 60px;
      text-align: center;
    }

    .coa-tree__actions {
      text-align: center;
    }

    .text-center {
      text-align: center;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .coa-tree__table {
        thead {
          display: none;
        }

        tbody tr {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-2, 0.5rem);
          padding: var(--space-3, 0.75rem);
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        td {
          display: flex;
          flex-direction: column;
          padding: 0;
          border: none;

          &::before {
            content: attr(data-label);
            font-size: var(--text-xs, 0.75rem);
            color: var(--text-secondary, #6b7280);
            font-weight: 500;
            text-transform: uppercase;
          }
        }

        .coa-tree__name {
          grid-column: 1 / -1;
        }

        .coa-tree__code {
          grid-column: 1 / -1;
        }

        .coa-tree__actions {
          grid-column: 1 / -1;
          justify-content: flex-end;
          flex-direction: row;
          align-items: center;

          &::before {
            display: none;
          }
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoaTreeComponent {
  @Input() cuentas: CuentaCOA[] = [];
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() isAdmin = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() actionClick = new EventEmitter<CoaTreeAction>();

  private readonly editIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  private readonly trashIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  getActionMenuItems(cuenta: CuentaCOA): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: this.editIcon,
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: this.trashIcon,
        cssClass: 'action-danger',
      },
    ];
  }

  onActionClick(actionId: string, cuenta: CuentaCOA): void {
    this.actionClick.emit({ actionId, cuenta });
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(limit);
  }
}
