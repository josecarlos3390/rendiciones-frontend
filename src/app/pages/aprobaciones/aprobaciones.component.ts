import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AprobacionesService, AprobacionPendiente } from '@services/aprobaciones.service';
import { NotificacionesService } from '@services/notificaciones.service';
import { ToastService } from '@core/toast/toast.service';
import { AprobacionesListComponent, AprobacionModalComponent } from './components';

@Component({
  selector:        'app-aprobaciones',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AprobacionesListComponent,
    AprobacionModalComponent,
  ],
  templateUrl: './aprobaciones.component.html',
  styleUrls:  ['./aprobaciones.component.scss'],
})
export class AprobacionesComponent implements OnInit {

  pendientes:       AprobacionPendiente[] = [];
  loading          = false;
  loadError        = false;

  // Filtro dinámico por nivel
  nivelFiltro: number | 'todas' = 'todas';

  // Modal acción
  showAccionModal  = false;
  accionActual:    'aprobar' | 'rechazar' | null = null;
  rendSeleccionada: AprobacionPendiente | null = null;
  comentario       = '';
  isSaving         = false;

  constructor(
    private svc:  AprobacionesService,
    private notifSvc: NotificacionesService,
    private toast: ToastService,
    private cdr:   ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading   = true;
    this.loadError = false;
    this.cdr.markForCheck();

    forkJoin({
      nivel1: this.svc.getPendientes().pipe(catchError(() => of([]))),
      nivel2: this.svc.getPendientesNivel2().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ nivel1, nivel2 }) => {
        // Unificar ambas listas y eliminar duplicados por U_IdRendicion
        const mapa = new Map<number, AprobacionPendiente>();
        for (const p of nivel1) mapa.set(p.U_IdRendicion, p);
        for (const p of nivel2) if (!mapa.has(p.U_IdRendicion)) mapa.set(p.U_IdRendicion, p);
        this.pendientes = Array.from(mapa.values()).sort((a, b) => b.U_IdRendicion - a.U_IdRendicion);
        this.loading    = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
      },
    });
  }

  onNivelFiltroChange(nivel: number | 'todas') {
    this.nivelFiltro = nivel;
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

        // Feedback optimista — quitar la fila de la lista
        this.pendientes = this.pendientes.filter(p => p.U_IdRendicion !== idRend);
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
        this.toast.error(err?.error?.message ?? 'Error al procesar la acción');
        this.cdr.markForCheck();
      },
    });
  }

  onVerDetalle(rend: AprobacionPendiente) {
    this.router.navigate(['/rend-m', rend.U_IdRendicion, 'detalle']);
  }
}
