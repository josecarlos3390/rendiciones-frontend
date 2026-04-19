/**
 * RendicionTableComponent - Tabla de rendiciones
 * 
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';


import { RendM } from '@models/rend-m.model';
import { ESTADO_LABEL, ESTADO_CLASS } from '@models/rend-m.model';
import { TableActionHeaderComponent } from '@shared/table-action-header/table-action-header.component';
import {
  ICON_VIEW,
  ICON_EDIT,
  ICON_TRASH,
  ICON_PRINT,
  ICON_SYNC,
  ICON_SEND,
  ICON_RETRY_SYNC,
  ICON_SYNC_SAP,
} from '@common/constants/icons';

export interface RendicionAction {
  action: string;
  rendicion: RendM;
}

@Component({
  selector: 'app-rendicion-table',
  standalone: true,
  imports: [TableActionHeaderComponent, CommonModule, RouterModule, ActionMenuComponent, PaginatorComponent, DdmmyyyyPipe],
  templateUrl: './rendicion-table.component.html',
  styleUrls: ['./rendicion-table.component.scss'],
})
export class RendicionTableComponent {
  @Input() rendiciones: RendM[] = [];
  @Input() paged: RendM[] = [];
  @Input() loading = false;
  @Input() loadError = false;
  @Input() page = 1;
  @Input() limit = 10;
  @Input() totalPages = 1;
  @Input() estadoFiltro = 'todas';
  @Input() isAdmin = false;
  @Input() esAprobador = false;
  /** true si el usuario puede sincronizar directamente (sinAprobador + puedeGenerarPre) */
  @Input() canSyncDirecto = false;
  /** true si el usuario tiene aprobador configurado (U_NomSup) y debe ver la opción Enviar */
  @Input() canEnviar = false;

  @Output() action = new EventEmitter<RendicionAction>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() retry = new EventEmitter<void>();

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  trackByRendicion(index: number, r: RendM): number {
    return r.U_IdRendicion;
  }

  getActionMenuItems(rend: RendM): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { id: 'view', label: 'Ver detalle', icon: ICON_VIEW },
    ];

    // Editar: solo si está abierta
    if (rend.U_Estado === 1) {
      items.push({ id: 'edit', label: 'Editar', icon: ICON_EDIT });
    }

    // Eliminar: solo admin o si está abierta
    if (this.isAdmin || rend.U_Estado === 1) {
      items.push({ id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'text-danger' });
    }

    // Imprimir: siempre disponible
    items.push({ id: 'print', label: 'Imprimir', icon: ICON_PRINT });

    // Sincronizar desde ABIERTO (1): solo si puede sincronizar directo
    if (rend.U_Estado === 1 && this.canSyncDirecto) {
      items.push({ id: 'sync', label: 'Sincronizar', cssClass: 'text-success', icon: ICON_SYNC });
    }

    // Enviar a aprobación desde ABIERTO (1): solo si tiene aprobador configurado y no puede sincronizar directo
    if (rend.U_Estado === 1 && this.canEnviar && !this.canSyncDirecto) {
      items.push({ id: 'send', label: 'Enviar', cssClass: 'text-primary', icon: ICON_SEND });
    }

    // Reintentar sincronización: estado ERROR_SYNC (6)
    if (rend.U_Estado === 6 && this.canSyncDirecto) {
      items.push({ id: 'retry-sync', label: 'Reintentar Sincronización', cssClass: 'text-warning', icon: ICON_RETRY_SYNC });
    }

    // Sincronizar estados finales (7=APROBADO, 5=SINCRONIZADO): cualquiera con puedeSync
    if ([4, 5, 7].includes(rend.U_Estado) && this.canSyncDirecto) {
      items.push({ id: 'sync', label: 'Sincronizar con SAP', icon: ICON_SYNC_SAP });
    }

    return items;
  }

  onAction(actionId: string | ActionMenuItem, rend: RendM): void {
    const action = typeof actionId === 'string' ? actionId : actionId.id;
    this.action.emit({ action, rendicion: rend });
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onRetry(): void {
    this.retry.emit();
  }

  getEstadoClass(estado: number): string {
    return this.estadoClass[estado] || 'status-badge';
  }

  getEstadoLabel(estado: number): string {
    return this.estadoLabel[estado] || 'DESCONOCIDO';
  }
}
