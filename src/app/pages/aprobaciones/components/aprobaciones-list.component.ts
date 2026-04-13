import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AprobacionPendiente } from '@services/aprobaciones.service';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { StatusBadgeComponent } from '@shared/status-badge';

@Component({
  selector: 'app-aprobaciones-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    DdmmyyyyPipe,
    SkeletonLoaderComponent,
    ActionMenuComponent,
    StatusBadgeComponent,
  ],
  template: `
    <!-- Filtros dinámicos por nivel -->
    <div class="filter-bar" *ngIf="nivelesDisponibles.length > 1">
      <div class="filter-field">
        <label>Nivel de aprobación</label>
        <div class="tab-switcher">
          <button type="button" class="tab-btn"
            [class.active]="nivelFiltro === 'todas'"
            (click)="onCambiarNivelFiltro('todas')">
            Todas
            <span class="sub-count-badge" *ngIf="nivelFiltro === 'todas' && items.length > 0">{{ items.length }}</span>
          </button>
          <button type="button" class="tab-btn"
            *ngFor="let n of nivelesDisponibles"
            [class.active]="nivelFiltro === n"
            (click)="onCambiarNivelFiltro(n)">
            Nivel {{ n }}
            <span class="sub-count-badge" *ngIf="nivelFiltro === n && itemsFiltrados.length > 0">{{ itemsFiltrados.length }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Estado carga -->
    <app-skeleton-loader *ngIf="loading" variant="table"
      [rows]="4" [columns]="['10%','18%','18%','14%','10%','10%','10%','10%']">
    </app-skeleton-loader>

    <!-- Empty state -->
    <div *ngIf="!loading && itemsFiltrados.length === 0" class="empty-state">
      <div class="empty-icon">✅</div>
      <p>No tenés rendiciones pendientes de aprobación</p>
    </div>

    <!-- Tabla de pendientes -->
    <div class="table-wrapper" *ngIf="!loading && itemsFiltrados.length > 0">
      <table class="data-table">
        <thead>
          <tr>
            <th class="text-center">N°</th>
            <th class="col-mobile-primary">Usuario</th>
            <th class="col-hide-mobile">Perfil</th>
            <th class="col-hide-mobile">Objetivo</th>
            <th class="text-center col-hide-mobile col-hide-tablet">Fecha Inicio</th>
            <th class="text-center col-hide-mobile col-hide-tablet">Fecha Final</th>
            <th class="text-right">Monto</th>
            <th class="text-center col-hide-mobile">Nivel</th>
            <th class="text-center">Estado</th>
            <th class="col-acciones">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of itemsFiltrados; trackBy: trackByPendiente">
            <td class="text-center" data-label="N°">
              <a class="link-primary" [routerLink]="['/rend-m', r.U_IdRendicion, 'detalle']">
                {{ r.U_IdRendicion }}
              </a>
            </td>
            <td class="col-mobile-primary" data-label="Usuario">{{ r.U_NomUsuario }}</td>
            <td class="col-hide-mobile" data-label="Perfil">{{ r.U_NombrePerfil }}</td>
            <td class="col-hide-mobile" data-label="Objetivo">{{ r.U_Objetivo }}</td>
            <td class="text-center col-hide-mobile col-hide-tablet" data-label="Fecha Inicio">{{ r.U_FechaIni | ddmmyyyy }}</td>
            <td class="text-center col-hide-mobile col-hide-tablet" data-label="Fecha Final">{{ r.U_FechaFinal | ddmmyyyy }}</td>
            <td class="text-right mono-cell" data-label="Monto">{{ r.U_Monto | number:'1.2-2' }}</td>
            <td class="text-center col-hide-mobile" data-label="Nivel">
              <span class="badge badge-primary">Nivel {{ r.U_Nivel }}</span>
            </td>
            <td class="text-center" data-label="Estado">
              <app-status-badge [type]="getBadgeType(r.U_Estado_Rend)">
                {{ estadoRendTexto(r.U_Estado_Rend) }}
              </app-status-badge>
            </td>
            <td class="col-acciones" data-label="Acciones">
              <app-action-menu
                [actions]="getActionMenuItems(r)"
                [itemLabel]="'Rendición N° ' + r.U_IdRendicion"
                (actionClick)="onActionClick($event, r)">
              </app-action-menu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .link-primary {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: var(--weight-semibold);
      font-family: var(--font-mono, monospace);
      
      &:hover {
        text-decoration: underline;
      }
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }

    // Sub-badge para contadores en tabs
    .sub-count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: var(--radius-pill);
      background: var(--color-primary);
      color: white;
      font-size: 10px;
      font-weight: var(--weight-bold);
      margin-left: 4px;
    }

    // TABLA — Control de anchos para columnas de texto largo
    .data-table {
      table-layout: auto;
      
      th, td {
        // Columnas con texto largo - permitir multilinea con ancho máximo
        &:nth-child(3),  // Perfil
        &:nth-child(4) { // Objetivo
          max-width: 220px;
          min-width: 120px;
          white-space: normal;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
        }
        
        // Fechas - ancho fijo
        &:nth-child(5),  // Fecha Inicio
        &:nth-child(6) { // Fecha Final
          min-width: 110px;
          white-space: nowrap;
        }
        
        // Monto - ancho fijo
        &:nth-child(7) {
          min-width: 100px;
          white-space: nowrap;
        }
        
        // Nivel y Estado - ancho fijo
        &:nth-child(8),  // Nivel
        &:nth-child(9) { // Estado
          min-width: 90px;
          white-space: nowrap;
        }
      }
    }

    // Celda de acciones - ancho fijo para el menú
    .data-table td.col-acciones {
      position: relative;
      white-space: nowrap;
      width: 90px;
      min-width: 90px;
      max-width: 90px;
      text-align: center;
    }

    // Dark mode variables
    :host-context([data-theme="dark"]) {
      .link-primary {
        color: var(--color-primary-light, #60a5fa);
      }
      
      .sub-count-badge {
        background: var(--color-primary-dark, #3b82f6);
      }
    }
  `]
})
export class AprobacionesListComponent {
  @Input() items: AprobacionPendiente[] = [];
  @Input() loading = false;
  @Input() nivelFiltro: number | 'todas' = 'todas';

  @Output() aprobar = new EventEmitter<AprobacionPendiente>();
  @Output() rechazar = new EventEmitter<AprobacionPendiente>();
  @Output() verDetalle = new EventEmitter<AprobacionPendiente>();
  @Output() nivelFiltroChange = new EventEmitter<number | 'todas'>();

  get nivelesDisponibles(): number[] {
    const niveles = new Set<number>();
    for (const p of this.items) niveles.add(p.U_Nivel);
    return Array.from(niveles).sort((a, b) => a - b);
  }

  get itemsFiltrados(): AprobacionPendiente[] {
    if (this.nivelFiltro === 'todas') return this.items;
    return this.items.filter(p => p.U_Nivel === this.nivelFiltro);
  }

  onCambiarNivelFiltro(nivel: number | 'todas'): void {
    this.nivelFiltroChange.emit(nivel);
  }

  trackByPendiente(index: number, p: AprobacionPendiente): number {
    return p.U_IdRendicion;
  }

  getBadgeType(estado: number): any {
    const map: Record<number, any> = {
      1: 'open',      // ABIERTO
      2: 'closed',    // CERRADO
      3: 'danger',    // ELIMINADO
      4: 'info',      // ENVIADO
      7: 'success',   // APROBADO
    };
    return map[estado] ?? 'neutral';
  }

  estadoRendTexto(estado: number): string {
    const map: Record<number, string> = {
      1: 'ABIERTO',
      2: 'CERRADO',
      3: 'ELIMINADO',
      4: 'ENVIADO',
      7: 'APROBADO',
    };
    return map[estado] ?? `Estado ${estado}`;
  }

  getActionMenuItems(rend: AprobacionPendiente): ActionMenuItem[] {
    return [
      {
        id: 'ver-detalle',
        label: 'Ver detalle',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        cssClass: 'text-primary',
      },
      {
        id: 'aprobar',
        label: 'Aprobar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        cssClass: 'text-success',
      },
      {
        id: 'rechazar',
        label: 'Rechazar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        cssClass: 'text-danger',
      },
    ];
  }

  onActionClick(actionId: string, rend: AprobacionPendiente): void {
    switch (actionId) {
      case 'ver-detalle':
        this.verDetalle.emit(rend);
        break;
      case 'aprobar':
        this.aprobar.emit(rend);
        break;
      case 'rechazar':
        this.rechazar.emit(rend);
        break;
    }
  }
}
