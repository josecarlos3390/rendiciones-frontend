import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Documento, TIPO_DOC_SAP_OPTIONS } from '@models/documento.model';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';

/**
 * Componente Dumb para tabla/cards de documentos.
 * Muestra los documentos con sus impuestos y acciones.
 */
@Component({
  selector: 'app-documentos-table',
  standalone: true,
  imports: [CommonModule, PaginatorComponent, ActionMenuComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './documentos-table.component.html',
  styleUrls: ['./documentos-table.component.scss'],
})
export class DocumentosTableComponent {
  @Input() items: Documento[] = [];
  @Input() page = 1;
  @Input() limit = 5;
  @Input() total = 0;
  @Input() totalPages = 1;
  @Input() loading = false;
  @Input() canEdit = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();
  @Output() edit = new EventEmitter<Documento>();
  @Output() delete = new EventEmitter<Documento>();

  private readonly tipoDocSapOptions = TIPO_DOC_SAP_OPTIONS;

  tipoDocSapLabel(val: number): string {
    return this.tipoDocSapOptions.find(o => o.value === Number(val))?.label ?? String(val);
  }

  tipoCalcLabel(val: string | number): string {
    return (val == 1 || val === '1' || val === 'G') ? 'GD' : 'GU';
  }

  isGrossingUp(val: string | number): boolean {
    return val == 1 || val === '1' || val === 'G';
  }

  isGrossingDown(val: string | number): boolean {
    return val == 0 || val === '0' || val === 'N' || val === 'D';
  }

  /**
   * Formatea un porcentaje para la tabla:
   *  - 0      → '—'
   *  - entero → '13%'
   *  - decimal → '3.50%'
   */
  fmtPct(val: number | string | null | undefined): string {
    if (val === null || val === undefined || val === '') return '—';
    const n = Number(val);
    if (isNaN(n) || n === 0) return '—';
    const decimals = n % 1 === 0 ? 0 : 2;
    return n.toFixed(decimals) + '%';
  }

  getActionMenuItems(d: Documento): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      {
        id: 'edit',
        label: 'Editar',
        icon: this.getEditIcon(),
      },
    ];

    if (this.canEdit) {
      items.push({
        id: 'delete',
        label: 'Eliminar',
        icon: this.getDeleteIcon(),
        cssClass: 'danger',
      });
    }

    return items;
  }

  private getEditIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  }

  private getDeleteIcon(): string {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';
  }

  onActionClick(actionId: string, d: Documento): void {
    if (actionId === 'edit') {
      this.edit.emit(d);
    } else if (actionId === 'delete') {
      this.delete.emit(d);
    }
  }
}
