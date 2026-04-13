import {
  Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

// Path Aliases - Services (Models incluidos en el servicio)
import { 
  IntegracionService, 
  RendPendiente, 
  RendicionSync, 
  RendSync, 
  SyncResult 
} from '@services/integracion.service';

// Path Aliases - Core
import { ToastService } from '@core/toast/toast.service';

// Path Aliases - Shared
import { SyncModalComponent } from '@shared/sync-modal';

// Auth (path alias relativo por compatibilidad)
import { AuthService } from '../../auth/auth.service';

// Dumb Components locales (Smart/Dumb pattern)
import {
  IntegracionHeaderComponent,
  IntegracionLoadingComponent,
  IntegracionErrorComponent,
  IntegracionEmptyComponent,
  IntegracionFilterBarComponent,
  IntegracionPendientesTableComponent,
  IntegracionUserTableComponent,
  IntegracionHistorialModalComponent,
  PendientesTableActionEvent,
  UserTableActionEvent,
} from './components';

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
    // Shared
    SyncModalComponent, 
    // Dumb Components
    IntegracionHeaderComponent,
    IntegracionLoadingComponent,
    IntegracionErrorComponent,
    IntegracionEmptyComponent,
    IntegracionFilterBarComponent,
    IntegracionPendientesTableComponent,
    IntegracionUserTableComponent,
    IntegracionHistorialModalComponent,
  ],
  templateUrl: './integracion.component.html',
  styleUrl: './integracion.component.scss',
})
export class IntegracionComponent implements OnInit {

  // ── Vista segun rol ───────────────────────────────────
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

  // Paginacion
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // Modal historial
  showHistorial    = false;
  historialRend:   RendPendiente | null = null;
  historialItems:  RendSync[] = [];
  loadingHistorial = false;

  // Modal sincronizacion SAP (componente compartido)
  @ViewChild(SyncModalComponent) syncModal?: SyncModalComponent;
  selectedRend: RendPendiente | null = null;

  constructor(
    public  auth:      AuthService,
    private svc:       IntegracionService,
    private toast:     ToastService,
    private cdr:       ChangeDetectorRef,
    private router:    Router,
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
        error: () => { 
          this.loading = false; 
          this.loadError = true; 
          this.cdr.markForCheck(); 
        },
      });
    } else {
      this.svc.getMisRendiciones().subscribe({
        next: (data) => {
          this.misRend = data;
          this.loading = false;
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: () => { 
          this.loading = false; 
          this.loadError = true; 
          this.cdr.markForCheck(); 
        },
      });
    }
  }

  // ── Busqueda y paginacion ─────────────────────────────
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

  onPageChange(p: number)  { 
    this.page = p;  
    this.updatePaging(); 
    this.cdr.markForCheck(); 
  }
  
  onLimitChange(l: number) { 
    this.limit = l; 
    this.page = 1; 
    this.updatePaging(); 
    this.cdr.markForCheck(); 
  }

  onSearchChange(value: string) {
    this.search = value;
    this.applyFilter();
  }

  onSearchCleared() {
    this.search = '';
    this.applyFilter();
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

  onSyncComplete(res: SyncResult) {
    this.load();
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

  // ── Handlers para Dumb Components ─────────────────────
  onPendientesAction(event: PendientesTableActionEvent): void {
    const { action, item } = event;
    switch (action) {
      case 'ver-detalle':
        this.router.navigate(['/rend-m', item.U_IdRendicion, 'detalle']);
        break;
      case 'historial':
        this.openHistorial(item);
        break;
      case 'sincronizar':
        this.abrirSyncModal(item);
        break;
    }
  }

  onUserAction(event: UserTableActionEvent): void {
    const { action, item } = event;
    switch (action) {
      case 'ver-detalle':
        this.router.navigate(['/rend-m', item.U_IdRendicion, 'detalle']);
        break;
      case 'historial':
        this.openHistorial(item);
        break;
    }
  }

  // ── Getters para templates ────────────────────────────
  get pendientesPaged(): RendPendiente[] {
    return this.paged as RendPendiente[];
  }

  get userPaged(): RendicionSync[] {
    return this.paged as RendicionSync[];
  }
}
