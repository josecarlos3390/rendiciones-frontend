import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, TemplateRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AprobacionesService, AprobacionPendiente } from '@services/aprobaciones.service';
import { NotificacionesService } from '@services/notificaciones.service';
import { ToastService } from '@core/toast/toast.service';
import { AprobacionModalComponent, AprobacionesEmptyComponent } from './components';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';
import { StatusBadgeComponent } from '@shared/status-badge';
import { ICON_VIEW, ICON_CHECK, ICON_CLOSE } from '@common/constants/icons';

@Component({
  selector:        'app-aprobaciones',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    DataTableComponent,
    DdmmyyyyPipe,
    StatusBadgeComponent,
    AprobacionModalComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    AprobacionesEmptyComponent,
  ],
  templateUrl: './aprobaciones.component.html',
  styleUrls:  ['./aprobaciones.component.scss'],
})
export class AprobacionesComponent extends AbstractCrudListComponent<AprobacionPendiente> implements OnInit {

  readonly store = new CrudListStore<AprobacionPendiente>({
    limit: 10,
    searchFields: ['U_NomUsuario', 'U_NombrePerfil', 'U_Objetivo'],
  });

  @ViewChild('nroCol', { static: true }) nroCol!: TemplateRef<any>;
  @ViewChild('fechaIniCol', { static: true }) fechaIniCol!: TemplateRef<any>;
  @ViewChild('fechaFinCol', { static: true }) fechaFinCol!: TemplateRef<any>;
  @ViewChild('montoCol', { static: true }) montoCol!: TemplateRef<any>;
  @ViewChild('nivelCol', { static: true }) nivelCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  tableConfig!: DataTableConfig;

  // Filtro din�mico por nivel
  nivelFiltro: number | 'todas' = 'todas';

  get nivelesDisponibles(): number[] {
    const niveles = new Set<number>();
    for (const p of this.store.items()) niveles.add(p.U_Nivel);
    return Array.from(niveles).sort((a, b) => a - b);
  }

  // Modal acci�n
  showAccionModal  = false;
  accionActual:    'aprobar' | 'rechazar' | null = null;
  rendSeleccionada: AprobacionPendiente | null = null;
  comentario       = '';
  isSaving         = false;

  constructor(
    private svc:  AprobacionesService,
    private notifSvc: NotificacionesService,
    private toast: ToastService,
    protected override cdr: ChangeDetectorRef,
    private router: Router,
  ) {
    super();
  }

  ngOnInit() {
    this.buildTableConfig();
    this.load();
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'U_IdRendicion', header: 'N°', align: 'center', cellTemplate: this.nroCol, mobile: { primary: true } },
        { key: 'U_NomUsuario', header: 'Usuario' },
        { key: 'U_NombrePerfil', header: 'Perfil', mobile: { hide: true } },
        { key: 'U_Objetivo', header: 'Objetivo', mobile: { hide: true } },
        { key: 'U_FechaIni', header: 'Fecha Inicio', align: 'center', cellTemplate: this.fechaIniCol, mobile: { hide: true } },
        { key: 'U_FechaFinal', header: 'Fecha Final', align: 'center', cellTemplate: this.fechaFinCol, mobile: { hide: true } },
        { key: 'U_Monto', header: 'Monto', align: 'right', cellTemplate: this.montoCol },
        { key: 'U_Nivel', header: 'Nivel', align: 'center', cellTemplate: this.nivelCol, mobile: { hide: true } },
        { key: 'U_Estado_Rend', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: [
        { id: 'ver-detalle', label: 'Ver detalle', icon: ICON_VIEW, cssClass: 'text-primary' },
        { id: 'aprobar', label: 'Aprobar', icon: ICON_CHECK, cssClass: 'text-success' },
        { id: 'rechazar', label: 'Rechazar', icon: ICON_CLOSE, cssClass: 'text-danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  load() {
    forkJoin({
      nivel1: this.svc.getPendientes().pipe(catchError(() => of([]))),
      nivel2: this.svc.getPendientesNivel2().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ nivel1, nivel2 }) => {
        // Unificar ambas listas y eliminar duplicados por U_IdRendicion
        const mapa = new Map<number, AprobacionPendiente>();
        for (const p of nivel1) mapa.set(p.U_IdRendicion, p);
        for (const p of nivel2) if (!mapa.has(p.U_IdRendicion)) mapa.set(p.U_IdRendicion, p);
        // Solo mostrar rendiciones en estado ENVIADO (4) � pendientes de aprobaci�n
        const items = Array.from(mapa.values())
          .filter(p => p.U_Estado_Rend === 4)
          .sort((a, b) => b.U_IdRendicion - a.U_IdRendicion);
        this.store.setItems(items);
        this.cdr.markForCheck();
      },
      error: () => {
        this.store.setItems([]);
        this.cdr.markForCheck();
      },
    });
  }

  onNivelFiltroChange(nivel: number | 'todas') {
    this.nivelFiltro = nivel;
    if (nivel === 'todas') {
      this.store.setCustomFilter('nivel', null);
    } else {
      this.store.setCustomFilter('nivel', (item: AprobacionPendiente) => item.U_Nivel === nivel);
    }
    this.cdr.markForCheck();
  }

  openAprobar(rend: AprobacionPendiente) {
    this.rendSeleccionada = rend;
    this.accionActual     = 'aprobar';
    this.comentario       = '';
    this.showAccionModal  = true;
    this.cdr.markForCheck();
  }

  openRechazar(rend: AprobacionPendiente) {
    this.rendSeleccionada = rend;
    this.accionActual     = 'rechazar';
    this.comentario       = '';
    this.showAccionModal  = true;
    this.cdr.markForCheck();
  }

  closeModal() {
    this.showAccionModal  = false;
    this.rendSeleccionada = null;
    this.accionActual     = null;
    this.comentario       = '';
    this.cdr.markForCheck();
  }

  confirmarAccion() {
    if (!this.rendSeleccionada || !this.accionActual || this.isSaving) return;
    if (this.accionActual === 'rechazar' && !this.comentario.trim()) return;

    this.isSaving = true;
    const idRend  = this.rendSeleccionada.U_IdRendicion;
    const obs     = this.accionActual === 'aprobar'
      ? this.svc.aprobar(idRend, this.comentario || undefined)
      : this.svc.rechazar(idRend, this.comentario);

    obs.subscribe({
      next: (res) => {
        this.isSaving = false;
        this.closeModal();
        this.toast.exito(res.message);

        // Feedback optimista � quitar la fila de la lista
        this.store.setItems(this.store.items().filter(p => p.U_IdRendicion !== idRend));
        this.cdr.markForCheck();

        // Notificar inmediatamente al sidebar para actualizar contadores (sin esperar polling)
        if (this.accionActual === 'aprobar') {
          this.notifSvc.emitirAprobacionProcesada(idRend);
        } else if (this.accionActual === 'rechazar') {
          this.notifSvc.emitirRendicionRechazada(idRend);
        }

        // Recargar en background para sincronizar con el servidor
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.toast.error(err?.error?.message ?? 'Error al procesar la acci�n');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers visuales ─────────────────────────────────────

  getBadgeType(estado: number): any {
    const map: Record<number, any> = {
      1: 'open',
      2: 'closed',
      3: 'danger',
      4: 'info',
      7: 'success',
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

  // ── Acciones tabla ───────────────────────────────────────

  onTableAction(event: { action: string; item: AprobacionPendiente }): void {
    switch (event.action) {
      case 'ver-detalle':
        this.router.navigate(['/rend-m', event.item.U_IdRendicion, 'detalle']);
        break;
      case 'aprobar':
        this.openAprobar(event.item);
        break;
      case 'rechazar':
        this.openRechazar(event.item);
        break;
    }
  }
}
