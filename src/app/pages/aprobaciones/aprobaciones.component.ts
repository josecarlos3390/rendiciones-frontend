import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AprobacionesService, AprobacionPendiente } from '../../services/aprobaciones.service';
import { ToastService } from '../../core/toast/toast.service';
import { DdmmyyyyPipe } from '../../shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';


@Component({
  selector:        'app-aprobaciones',
  standalone:      true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, RouterModule, FormsModule, DdmmyyyyPipe, SkeletonLoaderComponent],
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
    private toast: ToastService,
    private cdr:   ChangeDetectorRef,
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

  cambiarNivelFiltro(nivel: number | 'todas') {
    this.nivelFiltro = nivel;
    this.cdr.markForCheck();
  }

  get nivelesDisponibles(): number[] {
    const niveles = new Set<number>();
    for (const p of this.pendientes) niveles.add(p.U_Nivel);
    return Array.from(niveles).sort((a, b) => a - b);
  }

  get pendientesActivos(): AprobacionPendiente[] {
    if (this.nivelFiltro === 'todas') return this.pendientes;
    return this.pendientes.filter(p => p.U_Nivel === this.nivelFiltro);
  }

  get hayPendientes(): boolean {
    return this.pendientes.length > 0;
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

  estadoRendTexto(estado: number): string {
    const map: Record<number, string> = {
      1: 'ABIERTO', 2: 'CERRADO', 3: 'ELIMINADO', 4: 'ENVIADO', 7: 'APROBADO',
    };
    return map[estado] ?? `Estado ${estado}`;
  }

  estadoRendCss(estado: number): string {
    const map: Record<number, string> = {
      1: 'status-badge status-open',      // ABIERTO
      2: 'status-badge status-closed',    // CERRADO
      3: 'status-badge status-cancelled', // ELIMINADO
      4: 'status-badge status-confirmed', // ENVIADO
      7: 'status-badge status-closed',    // APROBADO
    };
    return map[estado] ?? 'status-badge';
  }

  trackByPendiente(index: number, p: AprobacionPendiente): number {
    return p.U_IdRendicion;
  }
}