import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IntegracionService, RendPendiente, RendicionSync, RendSync, SyncResult, SapCredentials,
} from '../../services/integracion.service';
import { AuthService }             from '../../auth/auth.service';
import { AppConfigService }        from '../../services/app-config.service';
import { ToastService }            from '../../core/toast/toast.service';
import { DdmmyyyyPipe }            from '../../shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { PaginatorComponent }      from '../../shared/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/debounce';


@Component({
  selector: 'app-integracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [CommonModule, RouterModule, FormsModule, DdmmyyyyPipe, SkeletonLoaderComponent, PaginatorComponent, SearchInputComponent],
  templateUrl: './integracion.component.html',
  styleUrls: ['./integracion.component.scss'],
})
export class IntegracionComponent implements OnInit {

  // ── Vista según rol ───────────────────────────────────
  get isAdmin(): boolean { return this.auth.isAdmin; }
  get puedeSync(): boolean { return this.auth.puedeSync; }

  // ── Estado general ────────────────────────────────────
  // ADMIN: lista de pendientes para sincronizar
  pendientes:  RendPendiente[] = [];
  // USER: sus propias rendiciones en estados 3/5/6
  misRend:     RendicionSync[] = [];

  filtered:    (RendPendiente | RendicionSync)[] = [];
  paged:       (RendPendiente | RendicionSync)[] = [];
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

  // Modal credenciales SAP (paso 1) — solo ADMIN
  showCredentials  = false;
  credRend:        RendPendiente | null = null;
  sapUser          = '';
  sapPassword      = '';
  showSapPassword  = false;
  credError        = '';

  // Modal confirmación sync (paso 2) — solo ADMIN
  showConfirmSync  = false;
  syncRend:        RendPendiente | null = null;
  isSyncing        = false;

  constructor(
    public  auth:      AuthService,
    public  appConfig: AppConfigService,
    private svc:       IntegracionService,
    private toast:     ToastService,
    private cdr:       ChangeDetectorRef,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading   = true;
    this.loadError = false;
    this.cdr.markForCheck();

    if (this.isAdmin || this.puedeSync) {
      this.svc.getPendientes().subscribe({
        next: (data) => {
          this.pendientes = data;
          this.loading    = false;
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
      });
    } else {
      this.svc.getMisRendiciones().subscribe({
        next: (data) => {
          this.misRend = data;
          this.loading = false;
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
      });
    }
  }

  // ── Búsqueda y paginación ─────────────────────────────
  applyFilter() {
    const q      = this.search.toLowerCase().trim();
    const source = (this.isAdmin || this.puedeSync) ? this.pendientes : this.misRend;
    this.filtered = q
      ? source.filter((r: any) =>
          (r.U_NomUsuario   ?? '').toLowerCase().includes(q) ||
          (r.U_NombrePerfil ?? '').toLowerCase().includes(q) ||
          (r.U_Objetivo     ?? '').toLowerCase().includes(q) ||
          String(r.U_IdRendicion).includes(q)
        )
      : [...source];
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

  // ── Modal credenciales SAP (paso 1) — solo ADMIN ──────
  openCredentials(rend: RendPendiente) {
    this.credRend    = rend;
    this.credError   = '';

    // En modo OFFLINE no hay SAP — saltar el paso de credenciales
    if (this.appConfig.isOffline) {
      this.sapUser         = '';
      this.sapPassword     = '';
      this.syncRend        = rend;
      this.showConfirmSync = true;
      this.cdr.markForCheck();
      return;
    }

    this.sapUser         = '';
    this.sapPassword     = '';
    this.showSapPassword = false;
    this.showCredentials = true;
    this.cdr.markForCheck();
  }

  closeCredentials() {
    this.showCredentials = false;
    this.credRend        = null;
    this.sapUser         = '';
    this.sapPassword     = '';
    this.credError       = '';
    this.cdr.markForCheck();
  }

  confirmarCredentials() {
    // En modo OFFLINE no se validan credenciales SAP
    if (!this.appConfig.isOffline) {
      if (!this.sapUser.trim()) {
        this.credError = 'El usuario SAP es obligatorio';
        this.cdr.markForCheck();
        return;
      }
      if (!this.sapPassword.trim()) {
        this.credError = 'La contraseña SAP es obligatoria';
        this.cdr.markForCheck();
        return;
      }
    }
    this.syncRend        = this.credRend;
    this.showCredentials = false;
    this.showConfirmSync = true;
    this.cdr.markForCheck();
  }

  toggleSapPassword() {
    this.showSapPassword = !this.showSapPassword;
    this.cdr.markForCheck();
  }

  // ── Modal confirmación sync (paso 2) — solo ADMIN ─────
  closeConfirmSync() {
    this.showConfirmSync = false;
    this.syncRend        = null;
    this.isSyncing       = false;
    this.sapUser         = '';
    this.sapPassword     = '';
    this.cdr.markForCheck();
  }

  confirmarSync() {
    if (!this.syncRend || this.isSyncing) return;
    this.isSyncing = true;
    const id = this.syncRend.U_IdRendicion;

    const credentials: SapCredentials = { sapUser: this.sapUser, sapPassword: this.sapPassword };

    this.svc.sincronizar(id, credentials).subscribe({
      next: (res: SyncResult) => {
        this.isSyncing   = false;
        this.sapUser     = '';
        this.sapPassword = '';
        this.closeConfirmSync();
        if (res.success) {
          this.toast.exito(`Rendición N° ${id} sincronizada — Doc. SAP: ${res.nroDocERP ?? '—'}`);
        } else {
          this.toast.error(`Error al sincronizar N° ${id}: ${res.mensaje}`);
        }
        this.load();
      },
      error: (err) => {
        this.isSyncing   = false;
        this.sapUser     = '';
        this.sapPassword = '';
        this.toast.error(err?.error?.message ?? 'Error al sincronizar con SAP');
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
      error: () => { this.loadingHistorial = false; this.cdr.markForCheck(); },
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
      5: 'SINCRONIZADO', 6: 'ERROR SYNC', 7: 'APROBADO',
    };
    return map[estado] ?? `Estado ${estado}`;
  }

  estadoCss(estado: number): string {
    const map: Record<number, string> = {
      5: 'badge-sync-ok', 6: 'badge-sync-error', 7: 'badge-aprobado',
    };
    return map[estado] ?? '';
  }

  syncEstadoCss(estado: string): string {
    if (estado === 'OK')    return 'badge-sync-ok';
    if (estado === 'ERROR') return 'badge-sync-error';
    return 'badge-pendiente';
  }

  esError(rend: RendPendiente): boolean { return rend.U_Estado === 6; }

  asRendicionSync(r: any): RendicionSync { return r as RendicionSync; }
}