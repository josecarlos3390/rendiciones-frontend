import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import {
  IntegracionService,
  RendPendiente,
  RendicionSync,
  RendSync,
  SyncResult,
} from '@services/integracion.service';
import { ToastService } from '@core/toast/toast.service';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { StatusBadgeComponent } from '@shared/status-badge';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';
import { SyncModalComponent } from '@shared/sync-modal';
import { AuthService } from '@auth/auth.service';
import { ICON_VIEW, ICON_HISTORY, ICON_SYNC, ICON_RETRY_SYNC } from '@common/constants/icons';

// Dumb Components locales
import {
  IntegracionHeaderComponent,
  IntegracionLoadingComponent,
  IntegracionErrorComponent,
  IntegracionEmptyComponent,
  IntegracionFilterBarComponent,
  IntegracionHistorialModalComponent,
} from './components';

type IntegracionItem = RendPendiente | RendicionSync;

/**
 * Smart Component: Integracion ERP
 *
 * Contiene toda la logica de negocio, estado y efectos secundarios.
 * Los Dumb Components se encargan de la presentacion.
 */
@Component({
  selector: 'app-integracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    StatusBadgeComponent,
    DdmmyyyyPipe,
    SyncModalComponent,
    IntegracionHeaderComponent,
    IntegracionLoadingComponent,
    IntegracionErrorComponent,
    IntegracionEmptyComponent,
    IntegracionFilterBarComponent,
    IntegracionHistorialModalComponent,
  ],
  templateUrl: './integracion.component.html',
  styleUrl: './integracion.component.scss',
})
export class IntegracionComponent extends AbstractCrudListComponent<IntegracionItem> implements OnInit {

  readonly store = new CrudListStore<IntegracionItem>({
    limit: 10,
    searchFields: ['U_NomUsuario', 'U_NombrePerfil', 'U_Objetivo', 'U_NroDocERP', 'U_IdRendicion'] as (keyof IntegracionItem)[],
  });

  @ViewChild('nroCol', { static: true }) nroCol!: TemplateRef<any>;
  @ViewChild('usuarioCol', { static: true }) usuarioCol!: TemplateRef<any>;
  @ViewChild('fechaIniCol', { static: true }) fechaIniCol!: TemplateRef<any>;
  @ViewChild('fechaFinCol', { static: true }) fechaFinCol!: TemplateRef<any>;
  @ViewChild('montoCol', { static: true }) montoCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;
  @ViewChild('docSapCol', { static: true }) docSapCol!: TemplateRef<any>;

  adminConfig!: DataTableConfig;
  userConfig!: DataTableConfig;

  get isAdmin(): boolean { return this.auth.isAdmin; }
  get puedeSync(): boolean { return this.auth.puedeSync; }
  get tableConfig(): DataTableConfig {
    return (this.isAdmin || this.puedeSync) ? this.adminConfig : this.userConfig;
  }

  // Modal historial
  showHistorial    = false;
  historialRend:   RendPendiente | null = null;
  historialItems:  RendSync[] = [];
  loadingHistorial = false;

  // Modal sincronizacion SAP
  @ViewChild(SyncModalComponent) syncModal?: SyncModalComponent;
  selectedRend: RendPendiente | null = null;

  constructor(
    public  auth:      AuthService,
    private svc:       IntegracionService,
    private toast:     ToastService,
    protected override cdr: ChangeDetectorRef,
    private router:    Router,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfigs();
    this.load();
  }

  // ── Configuracion de tabla ────────────────────────────────

  private buildTableConfigs(): void {
    this.adminConfig = {
      columns: [
        { key: 'U_IdRendicion', header: 'Nro', align: 'center', cellTemplate: this.nroCol, mobile: { primary: true } },
        { key: 'U_NomUsuario', header: 'Usuario', cellTemplate: this.usuarioCol },
        { key: 'U_NombrePerfil', header: 'Perfil', mobile: { hide: true } },
        { key: 'U_Objetivo', header: 'Objetivo', mobile: { hide: true } },
        { key: 'U_FechaIni', header: 'Fecha Inicio', align: 'center', cellTemplate: this.fechaIniCol, mobile: { hide: true } },
        { key: 'U_FechaFinal', header: 'Fecha Final', align: 'center', cellTemplate: this.fechaFinCol, mobile: { hide: true } },
        { key: 'U_Monto', header: 'Monto', align: 'right', cellTemplate: this.montoCol },
        { key: 'U_Estado', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: [
        { id: 'ver-detalle', label: 'Ver detalle', icon: ICON_VIEW, cssClass: 'text-primary' },
        { id: 'historial', label: 'Ver historial', icon: ICON_HISTORY },
        { id: 'sincronizar', label: 'Sincronizar con ERP', icon: ICON_SYNC, cssClass: 'text-success', condition: (item: any) => item.U_Estado !== 6 },
        { id: 'reintentar', label: 'Reintentar sincronización', icon: ICON_RETRY_SYNC, cssClass: 'text-warning', condition: (item: any) => item.U_Estado === 6 },
      ],
      striped: true,
      hoverable: true,
    };

    this.userConfig = {
      columns: [
        { key: 'U_IdRendicion', header: 'Nro', align: 'center', cellTemplate: this.nroCol, mobile: { primary: true } },
        { key: 'U_NombrePerfil', header: 'Perfil', mobile: { hide: true } },
        { key: 'U_Objetivo', header: 'Objetivo', mobile: { hide: true } },
        { key: 'U_FechaIni', header: 'Fecha Inicio', align: 'center', cellTemplate: this.fechaIniCol, mobile: { hide: true } },
        { key: 'U_FechaFinal', header: 'Fecha Final', align: 'center', cellTemplate: this.fechaFinCol, mobile: { hide: true } },
        { key: 'U_Monto', header: 'Monto', align: 'right', cellTemplate: this.montoCol },
        { key: 'U_Estado', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
        { key: 'U_NroDocERP', header: 'Doc. SAP', align: 'center', cellTemplate: this.docSapCol, mobile: { hide: true } },
      ],
      showActions: true,
      actions: [
        { id: 'ver-detalle', label: 'Ver detalle', icon: ICON_VIEW, cssClass: 'text-primary' },
        { id: 'historial', label: 'Ver historial sync', icon: ICON_HISTORY },
      ],
      striped: true,
      hoverable: true,
    };
  }

  rowClassFn = (item: IntegracionItem): string => (item.U_Estado === 6 ? 'row-error' : '');

  // ── Carga ─────────────────────────────────────────────────

  load() {
    const obs$ = (this.isAdmin || this.puedeSync)
      ? this.svc.getPendientes()
      : this.svc.getMisRendiciones();

    this.store.load(obs$, () => this.cdr.markForCheck());
  }

  // ── Acciones tabla ────────────────────────────────────────

  onTableAction(event: { action: string; item: IntegracionItem }): void {
    const item = event.item as RendPendiente;
    switch (event.action) {
      case 'ver-detalle':
        this.router.navigate(['/rend-m', item.U_IdRendicion, 'detalle']);
        break;
      case 'historial':
        this.openHistorial(item);
        break;
      case 'sincronizar':
      case 'reintentar':
        this.abrirSyncModal(item);
        break;
    }
  }

  // ── Modal sincronizacion SAP ─────────────────────────────

  abrirSyncModal(rend: RendPendiente) {
    this.selectedRend = rend;
    this.syncModal?.open({
      idRendicion: rend.U_IdRendicion,
      objetivo: rend.U_Objetivo,
      monto: rend.U_Monto,
      estado: rend.U_Estado,
      isRetry: rend.U_Estado === 6,
    });
  }

  onSyncComplete(_res: SyncResult) {
    this.load();
  }

  // ── Historial ───────────────────────────────────────────

  openHistorial(rend: RendPendiente) {
    this.historialRend    = rend;
    this.historialItems   = [];
    this.loadingHistorial = true;
    this.showHistorial    = true;
    this.cdr.markForCheck();

    this.svc.getHistorial(rend.U_IdRendicion).subscribe({
      next: (data) => {
        this.historialItems   = data;
        this.loadingHistorial = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingHistorial = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeHistorial() {
    this.showHistorial  = false;
    this.historialRend  = null;
    this.historialItems = [];
    this.cdr.markForCheck();
  }

  // ── Helpers visuales ─────────────────────────────────────

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
}
