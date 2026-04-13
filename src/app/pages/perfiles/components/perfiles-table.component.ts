import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Perfil } from '@models/perfil.model';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';

@Component({
  selector: 'app-perfiles-table',
  standalone: true,
  imports: [CommonModule, PaginatorComponent, ActionMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="text-center">Cód.</th>
            <th>Nombre Perfil</th>
            <th class="text-center">Moneda</th>
            <th class="text-center col-hide-mobile">Líneas</th>
            <th class="col-hide-mobile">Proveedores</th>
            <th class="col-hide-mobile">Cuentas</th>
            <th class="col-hide-mobile col-hide-tablet">Empleados</th>
            <th class="col-acciones">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of paged">
            <td class="text-center" data-label="Cód.">
              <span class="cod-badge">{{ p.U_CodPerfil }}</span>
            </td>
            <td class="col-mobile-primary" data-label="Nombre Perfil">{{ p.U_NombrePerfil }}</td>
            <td class="text-center" data-label="Moneda">
              <span class="code-tag">{{ p.U_Trabaja === '0' ? 'BS' : 'USD' }}</span>
            </td>
            <td class="text-center col-hide-mobile" data-label="Líneas">
              <span class="badge badge-secondary">{{ p.U_CntLineas || 10 }}</span>
            </td>
            <td class="col-hide-mobile" data-label="Proveedores">
              <span class="carac-badge">{{ p.U_PRO_CAR }}</span>
              <span class="carac-text" *ngIf="p.U_PRO_Texto">{{ p.U_PRO_Texto }}</span>
            </td>
            <td class="col-hide-mobile" data-label="Cuentas">
              <span class="carac-badge">{{ p.U_CUE_CAR }}</span>
              <span class="carac-text" *ngIf="p.U_CUE_Texto">{{ p.U_CUE_Texto }}</span>
            </td>
            <td class="col-hide-mobile col-hide-tablet" data-label="Empleados">
              <span class="carac-badge">{{ p.U_EMP_CAR }}</span>
              <span class="carac-text" *ngIf="p.U_EMP_TEXTO">{{ p.U_EMP_TEXTO }}</span>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                *ngIf="canEdit"
                [actions]="getActionMenuItems(p)"
                [itemLabel]="'Perfil ' + p.U_CodPerfil"
                (actionClick)="onActionClick($event, p)">
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
    :host {
      display: block;
    }

    .table-wrapper {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-weight: var(--weight-semibold);
      color: var(--text-secondary);
      background: var(--bg-faint);
      border-bottom: 1px solid var(--border-color);
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .data-table tbody tr:hover {
      background: var(--bg-faint);
    }

    .text-center {
      text-align: center;
    }

    .col-nombre {
      max-width: 240px;
      font-weight: var(--weight-medium);
      white-space: normal;
      line-height: 1.3;
    }

    .col-acciones {
      width: 60px;
      text-align: center;
    }

    .cod-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      background: var(--bg-faint);
      color: var(--text-muted);
    }

    .code-tag {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      font-family: var(--font-mono);
      background: var(--color-primary-bg);
      color: var(--color-primary-text);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
    }

    .badge-secondary {
      background: var(--bg-subtle);
      color: var(--text-secondary);
    }

    .carac-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      letter-spacing: 0.02em;
      text-transform: uppercase;
      background: var(--color-primary-bg);
      color: var(--color-primary-text);
      border: 1px solid var(--color-primary-border);
    }

    .carac-text {
      margin-left: 6px;
      font-size: var(--text-xs);
      color: var(--text-muted);
      font-family: var(--font-mono);
    }
  `]
})
export class PerfilesTableComponent {
  @Input() paged: Perfil[] = [];
  @Input() page = 1;
  @Input() limit = 5;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() canEdit = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<Perfil>();
  @Output() delete = new EventEmitter<Perfil>();

  getActionMenuItems(p: Perfil): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        cssClass: 'text-danger',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
      },
    ];
  }

  onActionClick(actionId: string, p: Perfil): void {
    switch (actionId) {
      case 'edit':
        this.edit.emit(p);
        break;
      case 'delete':
        this.delete.emit(p);
        break;
    }
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(limit);
  }
}
