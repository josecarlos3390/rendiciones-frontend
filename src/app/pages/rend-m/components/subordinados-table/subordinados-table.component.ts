import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';
import { TableActionHeaderComponent } from '@shared/table-action-header/table-action-header.component';

import { RendM, ESTADO_LABEL, ESTADO_CLASS } from '@models/rend-m.model';

@Component({
  standalone: true,
  selector: 'app-subordinados-table',
  imports: [
    CommonModule,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    PaginatorComponent,
    ActionMenuComponent,
    DdmmyyyyPipe,
    TableActionHeaderComponent,
  ],
  templateUrl: './subordinados-table.component.html',
  styleUrls: ['./subordinados-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubordinadosTableComponent {
  @Input() items: RendM[] = [];
  @Input() loading = false;
  @Input() page = 1;
  @Input() limit = 10;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() getActionItems: (r: RendM) => ActionMenuItem[] = () => [];

  @Output() actionClick = new EventEmitter<{ action: string; item: RendM }>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  private readonly estadoLabel = ESTADO_LABEL;
  private readonly estadoClass = ESTADO_CLASS;

  estadoTexto(estado: number): string {
    return this.estadoLabel[estado] ?? `Estado ${estado}`;
  }

  estadoCss(estado: number): string {
    return this.estadoClass[estado] ?? 'badge-secondary';
  }

  trackByRendicion(index: number, r: RendM): number {
    return r.U_IdRendicion;
  }

  onActionClick(actionId: string, r: RendM): void {
    this.actionClick.emit({ action: actionId, item: r });
  }
}
