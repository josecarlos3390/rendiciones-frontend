import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

  pendientes:  AprobacionPendiente[] = [];
  loading      = false;
  loadError    = false;

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

    this.svc.getPendientes().subscribe({
      next: (data) => {
        this.pendientes = data;
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
        this.toast.success(res.message);

        // Feedback optimista — quitar la fila inmediatamente
        this.pendientes = this.pendientes.filter(
          p => p.U_IdRendicion !== idRend
        );
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
      1: 'ABIERTO', 2: 'CERRADO', 3: 'APROBADO', 4: 'ENVIADO',
    };
    return map[estado] ?? `Estado ${estado}`;
  }

  estadoRendCss(estado: number): string {
    const map: Record<number, string> = {
      1: 'status-badge status-open',
      2: 'status-badge status-secondary',
      3: 'status-badge status-approved',
      4: 'status-badge status-sent',
    };
    return map[estado] ?? 'status-badge';
  }
}