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
import { FormsModule } from '@angular/forms';

import { RendM } from '@models/rend-m.model';
import { ESTADO_LABEL, ESTADO_CLASS } from '@models/rend-m.model';

export interface RendicionAction {
  action: string;
  rendicion: RendM;
}

@Component({
  selector: 'app-rendicion-table',
  standalone: true,
  imports: [CommonModule, RouterModule, ActionMenuComponent, PaginatorComponent, DdmmyyyyPipe],
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
      { id: 'view', label: 'Ver detalle', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' },
    ];

    // Editar: solo si está abierta
    if (rend.U_Estado === 1) {
      items.push({ id: 'edit', label: 'Editar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' });
    }

    // Eliminar: solo admin o si está abierta
    if (this.isAdmin || rend.U_Estado === 1) {
      items.push({ id: 'delete', label: 'Eliminar', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>', cssClass: 'text-danger' });
    }

    // Imprimir: siempre disponible
    items.push({ id: 'print', label: 'Imprimir', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>' });

    // Sincronizar: si está enviada, aprobada o con error
    if ([4, 5, 6, 7].includes(rend.U_Estado)) {
      items.push({ id: 'sync', label: 'Sincronizar con SAP', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>' });
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
