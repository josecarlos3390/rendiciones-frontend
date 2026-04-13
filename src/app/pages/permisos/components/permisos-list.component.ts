import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Permiso } from '@models/permiso.model';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';

@Component({
  selector: 'app-permisos-list',
  standalone: true,
  imports: [CommonModule, ActionMenuComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrapper">
      <table class="data-table permisos-table">
        <thead>
          <tr>
            <th class="col-perfil">Perfil</th>
            <th class="col-estado">Estado</th>
            <th class="col-acciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of permisos" class="permiso-row">
            <td class="col-perfil" data-label="Perfil">
              <span class="perfil-nombre">{{ p.U_NOMBREPERFIL }}</span>
            </td>
            <td class="col-estado" data-label="Estado">
              <app-status-badge [type]="'success'" [dot]="true">Activo</app-status-badge>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActionMenuItems()"
                (actionClick)="onActionClick($event, p)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display: block; }
    
    .table-wrapper {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    
    .permisos-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .permisos-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: var(--bg-faint);
      border-bottom: 1px solid var(--border-color);
    }
    
    .permisos-table th.col-acciones {
      text-align: center;
      width: 80px;
    }
    
    .permisos-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-soft);
      vertical-align: middle;
    }
    
    .permisos-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .permisos-table tbody tr:hover td {
      background: var(--bg-faint);
    }
    
    .perfil-nombre {
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }
    
    .col-acciones {
      text-align: center;
    }
    
    // Asegurar que el status-badge se vea correctamente
    .col-estado {
      text-align: center;
      
      ::ng-deep app-status-badge .status-badge {
        display: inline-flex;
      }
    }
    
    /* Responsive */
    @media (max-width: 640px) {
      .permisos-table thead {
        display: none;
      }
      
      .permisos-table tbody tr {
        display: block;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-soft);
      }
      
      .permisos-table td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border: none;
      }
      
      .permisos-table td::before {
        content: attr(data-label);
        font-size: var(--text-xs);
        font-weight: var(--weight-semibold);
        color: var(--text-muted);
        text-transform: uppercase;
      }
      
      .col-acciones::before {
        display: none;
      }
      
      .col-acciones {
        justify-content: flex-end;
        padding-top: 12px;
        border-top: 1px solid var(--border-soft);
        margin-top: 8px;
      }
    }
  `]
})
export class PermisosListComponent {
  @Input() permisos: Permiso[] = [];
  @Input() loading = false;

  @Output() delete = new EventEmitter<Permiso>();

  getActionMenuItems(): ActionMenuItem[] {
    return [
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        cssClass: 'danger',
      },
    ];
  }

  onActionClick(actionId: string, p: Permiso): void {
    if (actionId === 'delete') this.delete.emit(p);
  }
}
