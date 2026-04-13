import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RendD } from '../../../../models/rend-d.model';
import { Documento } from '../../../../models/documento.model';
import { DdmmyyyyPipe } from '../../../../shared/ddmmyyyy.pipe';
import { VirtualTableBodyComponent } from '../../../../shared/virtual-table';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/action-menu';
import { PaginatorComponent } from '../../../../shared/paginator/paginator.component';

export interface DocumentTableConfig {
  isReadonly: boolean;
  adjuntosCount: Record<number, number>;
}

export interface DocumentAction {
  action: string;
  document: RendD;
}

/**
 * Tabla de documentos de la rendición
 * Soporta dos vistas: 'documentos' (normal) e 'impuestos' (detalle de impuestos)
 * 
 * Vista Documentos: Muestra datos básicos + Importe, Base, Imp/Ret
 * Vista Impuestos: Muestra Tipo Doc + todos los impuestos (IVA, IT, IUE, RCIVA)
 */
@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [CommonModule, RouterModule, DdmmyyyyPipe, VirtualTableBodyComponent, ActionMenuComponent, PaginatorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-wrapper" *ngIf="documentos.length > 0">
      <!-- Tabs -->
      <div class="table-tabs">
        <button class="table-tab" [class.active]="activeTab === 'documentos'" (click)="setTab('documentos')">
          Documentos
        </button>
        <button class="table-tab" [class.active]="activeTab === 'impuestos'" (click)="setTab('impuestos')">
          Impuestos
        </button>
      </div>

      <!-- Vista Documentos - Con todas las columnas de reducciones -->
      <div class="table-scroll-wrapper" *ngIf="activeTab === 'documentos'">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-sticky">Concepto</th>
              <th>Fecha</th>
              <th>Tipo Doc.</th>
              <th class="text-right">Importe</th>
              <th class="text-right col-reduccion">Exento</th>
              <th class="text-right col-reduccion">ICE</th>
              <th class="text-right col-reduccion">Tasa</th>
              <th class="text-right col-reduccion">Tasa Cero</th>
              <th class="text-right col-reduccion">GiftCard</th>
              <th class="text-right col-reduccion">Desc.</th>
              <th class="text-right col-base">Base Imp.</th>
              <th class="text-right">Imp/Ret</th>
              <th class="text-right col-total">Total</th>
              <th class="text-center col-acciones-adjuntos" title="Acciones y Adjuntos">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5;">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l-.06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </th>
            </tr>
          </thead>
          <app-virtual-table-body [items]="paged" [itemHeight]="56" [colspan]="14">
            <ng-template #rowTemplate let-d>
              <tr class="doc-row">
                <!-- 1. CONCEPTO: Título principal -->
                <td class="col-sticky col-mobile-primary" data-label="Concepto">
                  <span class="sticky-id">#{{ d.U_RD_IdRD }} · {{ d.U_RD_Concepto }}</span>
                </td>
                
                <!-- 2. FECHA -->
                <td class="text-center col-fecha" data-label="Fecha">{{ d.U_RD_Fecha | ddmmyyyy }}</td>
                
                <!-- 3. TIPO DOC -->
                <td class="col-tipo-doc" data-label="Tipo Doc.">
                  <span class="type-tag">{{ getTipoDocName(d.U_RD_TipoDoc) }}</span>
                </td>
                
                <!-- 4. IMPORTE -->
                <td class="text-right mono col-importe col-mobile-money" data-label="Importe">
                  {{ d.U_RD_Importe | number:'1.2-2' }}
                </td>
                
                <!-- 5-10. REDUCCIONES (solo mostrar si tienen valor) -->
                <td class="text-right mono col-reduccion" data-label="Exento" [class.col-hide-mobile]="!d.U_RD_Exento">
                  {{ (d.U_RD_Exento ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right mono col-reduccion" data-label="ICE" [class.col-hide-mobile]="!d.U_ICE">
                  {{ (d.U_ICE ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right mono col-reduccion" data-label="Tasa" [class.col-hide-mobile]="!d.U_TASA">
                  {{ (d.U_TASA ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right mono col-reduccion" data-label="Tasa Cero" [class.col-hide-mobile]="!d.U_RD_TasaCero">
                  {{ (d.U_RD_TasaCero ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right mono col-reduccion" data-label="GiftCard" [class.col-hide-mobile]="!d.U_GIFTCARD">
                  {{ (d.U_GIFTCARD ?? 0) | number:'1.2-2' }}
                </td>
                <td class="text-right mono col-reduccion" data-label="Desc." [class.col-hide-mobile]="!d.U_RD_Descuento">
                  {{ (d.U_RD_Descuento ?? 0) | number:'1.2-2' }}
                </td>
                
                <!-- 11. BASE IMPONIBLE -->
                <td class="text-right mono col-base col-mobile-money" data-label="Base Imp.">
                  {{ calcularBase(d) | number:'1.2-2' }}
                </td>
                
                <!-- 12. IMP/RET -->
                <td class="text-right mono col-impret" data-label="Imp/Ret">
                  {{ (d.U_RD_ImpRet ?? 0) | number:'1.2-2' }}
                </td>
                
                <!-- 13. TOTAL -->
                <td class="text-right mono total-cell col-total col-mobile-total" data-label="Total">
                  {{ (d.U_RD_Total ?? 0) | number:'1.2-2' }}
                </td>
                
                <!-- 14. ACCIONES -->
                <td class="text-center col-acciones-adjuntos" data-label="Acciones">
                  <div class="acciones-adjuntos-wrap">
                    <app-action-menu
                      *ngIf="!config.isReadonly"
                      [actions]="getActionItems(d)"
                      [itemLabel]="'Documento ' + d.U_RD_IdRD"
                      (actionClick)="onAction($event, d)">
                    </app-action-menu>
                    <button class="btn btn-sm btn-ghost btn-dist" 
                            *ngIf="config.isReadonly"
                            title="Distribución porcentual"
                            (click)="onAction('distribuir', d)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="9" cy="12" r="3"/><path d="M9 3v3M9 18v3M3 9h3M18 9h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
                      </svg>
                    </button>
                    <button class="btn btn-sm btn-ghost btn-adjuntos" 
                      title="Ver adjuntos"
                      (click)="onAction('adjuntos', d)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                      </svg>
                      <span class="adjuntos-badge" *ngIf="getAdjuntosCount(d.U_RD_IdRD) > 0">
                        {{ getAdjuntosCount(d.U_RD_IdRD) }}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </app-virtual-table-body>
          <tfoot>
            <tr class="totals-row">
              <td colspan="3" class="totals-label">Totales</td>
              <td class="text-right mono total-cell">{{ totales.importe | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.exento | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.ice | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.tasa | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.tasaCero | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.giftcard | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-reduccion">{{ totales.descuento | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-base">{{ totales.base | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell">{{ totales.impRet | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-total">{{ totales.total | number:'1.2-2' }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Vista Impuestos - Detalle de impuestos y retenciones -->
      <div class="table-scroll-wrapper" *ngIf="activeTab === 'impuestos'">
        <table class="data-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Tipo Doc.</th>
              <th class="text-right">Importe</th>
              <th class="text-right">Base</th>
              <th class="text-right col-impuesto">IVA</th>
              <th class="text-right col-impuesto">IT</th>
              <th class="text-right col-impuesto">IUE</th>
              <th class="text-right col-impuesto">RC-IVA</th>
              <th class="text-right">Imp/Ret</th>
              <th class="text-right col-total">Total</th>
            </tr>
          </thead>
          <app-virtual-table-body [items]="paged" [itemHeight]="56" [colspan]="10">
            <ng-template #rowTemplate let-d>
              <tr class="imp-row">
                <!-- 1. CONCEPTO -->
                <td class="col-prov col-mobile-primary" data-label="Concepto">
                  <div class="impuestos-prov">
                    <span class="impuestos-id">#{{ d.U_RD_IdRD }}</span>
                    <span class="impuestos-nombre">{{ d.U_RD_Concepto }}</span>
                  </div>
                </td>
                
                <!-- 2. TIPO DOC -->
                <td class="col-tipo-doc" data-label="Tipo Doc.">
                  <span class="type-tag">{{ getTipoDocName(d.U_RD_TipoDoc) }}</span>
                </td>
                
                <!-- 3. IMPORTE -->
                <td class="text-right mono col-importe" data-label="Importe">
                  {{ d.U_RD_Importe | number:'1.2-2' }}
                </td>
                
                <!-- 4. BASE -->
                <td class="text-right mono col-base" data-label="Base">
                  {{ calcularBase(d) | number:'1.2-2' }}
                </td>
                
                <!-- 5. IVA -->
                <td class="text-right mono col-impuesto col-iva" data-label="IVA">
                  <span class="imp-valor-iva" [class.con-valor]="d.U_MontoIVA > 0">
                    {{ d.U_MontoIVA | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- 6. IT -->
                <td class="text-right mono col-impuesto col-it" data-label="IT">
                  <span [class.imp-valor]="d.U_MontoIT > 0">
                    {{ d.U_MontoIT | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- 7. IUE -->
                <td class="text-right mono col-impuesto col-iue" data-label="IUE">
                  <span [class.imp-valor]="d.U_MontoIUE > 0">
                    {{ d.U_MontoIUE | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- 8. RC-IVA -->
                <td class="text-right mono col-impuesto col-rciva" data-label="RC-IVA">
                  <span [class.imp-valor]="d.U_MontoRCIVA > 0">
                    {{ d.U_MontoRCIVA | number:'1.2-2' }}
                  </span>
                </td>
                
                <!-- 9. Imp/Ret -->
                <td class="text-right mono col-impret" data-label="Imp/Ret">
                  {{ (d.U_RD_ImpRet ?? 0) | number:'1.2-2' }}
                </td>
                
                <!-- 10. TOTAL -->
                <td class="text-right mono total-cell col-total col-mobile-total" data-label="Total">
                  {{ (d.U_RD_Total ?? 0) | number:'1.2-2' }}
                </td>
              </tr>
            </ng-template>
          </app-virtual-table-body>
          <tfoot>
            <tr class="totals-row">
              <td colspan="2" class="totals-label">Totales</td>
              <td class="text-right mono total-cell">{{ totales.importe | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-base">{{ totales.base | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-impuesto">{{ totalesImpuestos.iva | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-impuesto">{{ totalesImpuestos.it | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-impuesto">{{ totalesImpuestos.iue | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-impuesto">{{ totalesImpuestos.rciva | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell">{{ totales.impRet | number:'1.2-2' }}</td>
              <td class="text-right mono total-cell col-total">{{ totales.total | number:'1.2-2' }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Paginador -->
      <app-paginator *ngIf="documentos.length > 0"
        [page]="page" 
        [limit]="limit"
        [total]="documentos.length" 
        [totalPages]="totalPages"
        (pageChange)="onPageChange($event)"
        (limitChange)="onLimitChange($event)">
      </app-paginator>
    </div>
  `,
  styleUrls: ['./document-table.component.scss'],
})
export class DocumentTableComponent {
  @Input() documentos: RendD[] = [];
  @Input() paged: RendD[] = [];
  @Input() tiposDocs: Documento[] = [];
  @Input() config: DocumentTableConfig = { isReadonly: false, adjuntosCount: {} };
  @Input() page = 1;
  @Input() limit = 10;
  @Input() totalPages = 1;
  @Input() activeTab: 'documentos' | 'impuestos' = 'documentos';
  @Input() totales = {
    importe: 0, exento: 0, ice: 0, tasa: 0, tasaCero: 0, giftcard: 0, descuento: 0,
    base: 0, impRet: 0, total: 0
  };
  @Input() totalesImpuestos = { iva: 0, it: 0, iue: 0, rciva: 0 };
  
  @Output() action = new EventEmitter<DocumentAction>();
  @Output() tabChange = new EventEmitter<'documentos' | 'impuestos'>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() limitChange = new EventEmitter<number>();

  setTab(tab: 'documentos' | 'impuestos'): void {
    this.tabChange.emit(tab);
  }

  onPageChange(page: number): void {
    this.pageChange.emit(page);
  }

  onLimitChange(limit: number): void {
    this.limitChange.emit(limit);
  }

  // Iconos SVG para el action menu
  private readonly icons = {
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    paperclip: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    'pie-chart': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  };

  getActionItems(doc: RendD): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      { id: 'edit', label: 'Editar', icon: this.icons.edit },
      { id: 'adjuntos', label: 'Adjuntos', icon: this.icons.paperclip },
      { id: 'distribuir', label: 'Distribución', icon: this.icons['pie-chart'] },
      { id: 'delete', label: 'Eliminar', icon: this.icons.trash, cssClass: 'danger' },
    ];
    return items;
  }

  onAction(actionId: string, doc: RendD): void {
    this.action.emit({ action: actionId, document: doc });
  }

  getAdjuntosCount(idRD: number): number {
    return this.config.adjuntosCount[idRD] || 0;
  }

  getTipoDocName(idDocumento: number | string): string {
    const doc = this.tiposDocs.find(d => String(d.U_IdDocumento) === String(idDocumento));
    return doc?.U_TipDoc || String(idDocumento);
  }

  calcularBase(doc: RendD): number {
    return doc.U_RD_Importe - 
           (doc.U_RD_Exento ?? 0) - 
           doc.U_ICE - 
           (doc.U_TASA ?? 0) - 
           (doc.U_RD_TasaCero ?? 0) - 
           (doc.U_GIFTCARD ?? 0);
  }
}
