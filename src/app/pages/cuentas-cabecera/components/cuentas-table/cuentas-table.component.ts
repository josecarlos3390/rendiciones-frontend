import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CuentaCabecera } from '@models/cuenta-cabecera.model';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';

@Component({
  selector: 'app-cuentas-table',
  standalone: true,
  imports: [
    CommonModule,
    PaginatorComponent,
    ActionMenuComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './cuentas-table.component.html',
  styleUrls: ['./cuentas-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasTableComponent {
  @Input({ required: true }) cuentas: CuentaCabecera[] = [];
  @Input({ required: true }) paged: CuentaCabecera[] = [];
  @Input({ required: true }) page = 1;
  @Input({ required: true }) limit = 5;
  @Input({ required: true }) totalPages = 1;
  @Input({ required: true }) filteredCount = 0;
  @Input() puedeEditar = false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() actionClick = new EventEmitter<{ actionId: string; cuenta: CuentaCabecera }>();

  getActionMenuItems(_c: CuentaCabecera): ActionMenuItem[] {
    return [
      {
        id: 'delete',
        label: 'Eliminar',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
        cssClass: 'danger',
      },
    ];
  }

  onPageChange(p: number): void {
    this.pageChange.emit(p);
  }

  onLimitChange(l: number): void {
    this.limitChange.emit(l);
  }

  onActionClick(actionId: string, cuenta: CuentaCabecera): void {
    this.actionClick.emit({ actionId, cuenta });
  }
}
