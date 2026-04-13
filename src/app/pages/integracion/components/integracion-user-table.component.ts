import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RendicionSync } from '@services/integracion.service';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';

export interface UserTableActionEvent {
  action: string;
  item: RendicionSync;
}

@Component({
  selector: 'app-integracion-user-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    PaginatorComponent,
    StatusBadgeComponent,
    ActionMenuComponent,
    DdmmyyyyPipe,
  ],
  template: `
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="text-center">Nro</th>
            <th class="col-mobile-primary">Perfil</th>
            <th class="col-hide-mobile">Objetivo</th>
            <th class="text-center col-hide-mobile col-hide-tablet">Fecha Inicio</th>
            <th class="text-center col-hide-mobile col-hide-tablet">Fecha Final</th>
            <th class="text-right">Monto</th>
            <th class="text-center">Estado</th>
            <th class="text-center col-hide-mobile">Doc. SAP</th>
            <th class="col-acciones">
              <span class="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of items" [class.row-error]="esError(r)">
            <td class="text-center" data-label="Nro">
              <a class="link-primary" [routerLink]="['/rend-m', r.U_IdRendicion, 'detalle']">
                {{ r.U_IdRendicion }}
              </a>
            </td>
            <td class="col-mobile-primary" data-label="Perfil">{{ r.U_NombrePerfil }}</td>
            <td class="col-hide-mobile" data-label="Objetivo">{{ r.U_Objetivo }}</td>
            <td class="text-center col-hide-mobile col-hide-tablet" data-label="Fecha Inicio">{{ r.U_FechaIni | ddmmyyyy }}</td>
            <td class="text-center col-hide-mobile col-hide-tablet" data-label="Fecha Final">{{ r.U_FechaFinal | ddmmyyyy }}</td>
            <td class="text-right mono-cell" data-label="Monto">{{ r.U_Monto | number:'1.2-2' }}</td>
            <td class="text-center" data-label="Estado">
              <app-status-badge [type]="getEstadoBadgeType(r.U_Estado)" [dot]="true">
                {{ getEstadoBadgeText(r.U_Estado) }}
              </app-status-badge>
            </td>
            <td class="text-center col-hide-mobile" data-label="Doc. SAP">
              <code class="doc-erp-code" *ngIf="r.U_NroDocERP">
                {{ r.U_NroDocERP }}
              </code>
              <span class="muted" *ngIf="!r.U_NroDocERP">-</span>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActionMenuItems(r)"
                [itemLabel]="'Rendicion Nro ' + r.U_IdRendicion"
                (actionClick)="onActionClick($event, r)">
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
        (pageChange)="pageChange.emit($event)"
        (limitChange)="limitChange.emit($event)">
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
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
    }
    
    .data-table th,
    .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border-soft);
      color: var(--text-primary);
    }
    
    .data-table th {
      background: var(--bg-faint);
      font-weight: var(--weight-semibold);
      font-size: var(--text-sm);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    
    .data-table tbody tr:hover {
      background: var(--bg-hover);
    }
    
    .data-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .row-error td {
      background: var(--color-danger-soft);
    }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    
    .link-primary {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: var(--weight-medium);
    }
    
    .link-primary:hover {
      text-decoration: underline;
    }
    
    .mono-cell {
      font-family: var(--font-mono);
    }
    
    .doc-erp-code {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      background: var(--bg-faint);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      color: var(--color-primary-text);
      letter-spacing: 0.3px;
    }
    
    .muted {
      color: var(--text-faint);
    }
    
    .col-acciones {
      width: 60px;
      text-align: center;
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class IntegracionUserTableComponent {
  @Input() items: RendicionSync[] = [];
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Input() totalPages = 1;
  
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() actionClick = new EventEmitter<UserTableActionEvent>();

  esError(rend: RendicionSync): boolean {
    return rend.U_Estado === 6;
  }

  getEstadoBadgeType(estado: number): 'sync' | 'error' | 'success' | 'neutral' {
    const map: Record<number, 'sync' | 'error' | 'success' | 'neutral'> = {
      5: 'sync',
      6: 'error',
      7: 'success',
    };
    return map[estado] ?? 'neutral';
  }

  getEstadoBadgeText(estado: number): string {
    const map: Record<number, string> = {
      5: 'SINCRONIZADO',
      6: 'ERROR SYNC',
      7: 'APROBADO',
    };
    return map[estado] ?? 'Estado ' + estado;
  }

  getActionMenuItems(r: RendicionSync): ActionMenuItem[] {
    return [
      {
        id: 'ver-detalle',
        label: 'Ver detalle',
        icon: this.getIconEye(),
        cssClass: 'text-primary',
      },
      {
        id: 'historial',
        label: 'Ver historial sync',
        icon: this.getIconHistory(),
      },
    ];
  }

  onActionClick(action: string, item: RendicionSync): void {
    this.actionClick.emit({ action, item });
  }

  private getIconEye(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }

  private getIconHistory(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }
}
