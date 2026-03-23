import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IntegracionService, RendPendiente, RendSync, SyncResult,
} from '../../services/integracion.service';
import { ToastService }            from '../../core/toast/toast.service';
import { DdmmyyyyPipe }            from '../../shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { PaginatorComponent }      from '../../shared/paginator/paginator.component';


@Component({
  selector: 'app-integracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, DdmmyyyyPipe, SkeletonLoaderComponent, PaginatorComponent],
  templateUrl: './integracion.component.html',
  styleUrls: ['./integracion.component.scss'],
})
export class IntegracionComponent implements OnInit {

  pendientes:  RendPendiente[] = [];
  filtered:    RendPendiente[] = [];
  paged:       RendPendiente[] = [];
  search       = '';
  loading      = false;
  loadError    = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // Modal historial
  showHistorial    = false;
  historialRend:   RendPendiente | null = null;
  historialItems:  RendSync[] = [];
  loadingHistorial = false;

  // Modal confirmación sync
  showConfirmSync  = false;
  syncRend:        RendPendiente | null = null;
  isSyncing        = false;

  constructor(
    private svc:   IntegracionService,
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
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Búsqueda y paginación ─────────────────────────────
  applyFilter() {
    const q = this.search.toLowerCase().trim();
    this.filtered = q
      ? this.pendientes.filter(r =>
          (r.U_NomUsuario   ?? '').toLowerCase().includes(q) ||
          (r.U_NombrePerfil ?? '').toLowerCase().includes(q) ||
          (r.U_Objetivo     ?? '').toLowerCase().includes(q) ||
          String(r.U_IdRendicion).includes(q)
        )
      : [...this.pendientes];
    this.page = 1;
    this.updatePaging();
    this.cdr.markForCheck();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); this.cdr.markForCheck(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); this.cdr.markForCheck(); }

  // ── Sync ──────────────────────────────────────────────
  openConfirmSync(rend: RendPendiente) {
    this.syncRend        = rend;
    this.showConfirmSync = true;
    this.cdr.markForCheck();
  }

  closeConfirmSync() {
    this.showConfirmSync = false;
    this.syncRend        = null;
    this.cdr.markForCheck();
  }

  confirmarSync() {
    if (!this.syncRend || this.isSyncing) return;
    this.isSyncing = true;
    const id = this.syncRend.U_IdRendicion;

    this.svc.sincronizar(id).subscribe({
      next: (res: SyncResult) => {
        this.isSyncing = false;
        this.closeConfirmSync();
        if (res.success) {
          this.toast.success(`Rendición N° ${id} sincronizada — Doc. ERP: ${res.nroDocERP ?? '—'}`);
        } else {
          this.toast.error(`Error al sincronizar N° ${id}: ${res.mensaje}`);
        }
        this.load();
      },
      error: (err) => {
        this.isSyncing = false;
        this.toast.error(err?.error?.message ?? 'Error al sincronizar');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Historial ─────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────
  estadoTexto(estado: number): string {
    const map: Record<number, string> = {
      3: 'APROBADO',
      5: 'SINCRONIZADO',
      6: 'ERROR SYNC',
    };
    return map[estado] ?? `Estado ${estado}`;
  }

  estadoCss(estado: number): string {
    const map: Record<number, string> = {
      3: 'badge-aprobado',
      5: 'badge-sync-ok',
      6: 'badge-sync-error',
    };
    return map[estado] ?? '';
  }

  syncEstadoCss(estado: string): string {
    if (estado === 'OK')    return 'badge-sync-ok';
    if (estado === 'ERROR') return 'badge-sync-error';
    return 'badge-pendiente';
  }

  esError(rend: RendPendiente): boolean {
    return rend.U_Estado === 6;
  }
}