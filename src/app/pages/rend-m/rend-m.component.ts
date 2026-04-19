import { RouterModule, Router } from '@angular/router';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, Subject, takeUntil } from 'rxjs';

import { AprobacionesService }    from '@services/aprobaciones.service';
import { RendMService }           from './rend-m.service';
import { RendDService }           from '../rend-d/rend-d.service';
import { ToastService }           from '@core/toast/toast.service';

import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { AuthService }            from '@auth/auth.service';
import { PerfilesService }        from '../perfiles/perfiles.service';
import { PermisosService }        from '../permisos/permisos.service';
import { CuentasCabeceraService } from '../cuentas-cabecera/cuentas-cabecera.service';
import { CuentaCabecera }         from '@models/cuenta-cabecera.model';
import { Perfil }                 from '@models/perfil.model';
import { Permiso }                from '@models/permiso.model';
import { Empleado } from '@shared/empleado-search/empleado-search.component';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { RendicionPdfPreviewComponent } from '@shared/rendicion-pdf/rendicion-pdf-preview.component';
import { ActionMenuItem } from '@shared/action-menu';

import { FormDirtyService } from '@shared/form-dirty';
import { PickerModalComponent, PickerItem } from '@shared/picker-modal/picker-modal.component';
import { EmptyStateComponent } from '@shared/empty-state/empty-state.component';
import { SyncModalComponent } from '@shared/sync-modal';
import { RendicionFilterService } from '@services/rendicion-filter.service';
import { IntegracionService, SyncResult } from '@services/integracion.service';
import {
  RendM, CreateRendMPayload,
  ESTADO_LABEL, ESTADO_CLASS,
} from '@models/rend-m.model';
import { RendD } from '@models/rend-d.model';
import {
  ICON_VIEW,
  ICON_PRINT,
  ICON_EDIT,
  ICON_SYNC,
  ICON_SEND,
  ICON_RETRY_SYNC,
  ICON_TRASH,
  ICON_CHECK,
  ICON_CLOSE,
} from '@common/constants/icons';

// 🆕 Componentes dumb refactorizados

import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import {
  RendicionFormComponent,
  RendicionFormData,
  RendicionFiltersComponent,
  RendicionTableComponent,
  PerfilSelectorComponent,
  SubordinadosTableComponent,
  RendicionAction,
} from './components';

@Component({
  standalone: true,
  selector: 'app-rend-m',
  imports: [CrudPageHeaderComponent,
    CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    // Core/Shared
    SkeletonLoaderComponent,
    RendicionPdfPreviewComponent, EmptyStateComponent,
    SyncModalComponent, PickerModalComponent,

    // 🆕 Componentes dumb refactorizados
    RendicionFormComponent,
    RendicionFiltersComponent,
    RendicionTableComponent,
    PerfilSelectorComponent,
    SubordinadosTableComponent,
  ],
  templateUrl: './rend-m.component.html',
  styleUrls: ['./rend-m.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendMComponent implements OnInit, OnDestroy {

  @ViewChild(SyncModalComponent) syncModal?: SyncModalComponent;

  private destroy$ = new Subject<void>();

  rendiciones:  RendM[] = [];
  filtered:     RendM[] = [];
  paged:        RendM[] = [];
  search        = '';
  loading       = false;
  loadError     = false;

  page       = 1;
  limit      = 10;
  totalPages = 1;

  showForm       = false;
  editingRend:   RendM | null = null;
  isSaving       = false;
  form!:         FormGroup;
  initialValues: Record<string, unknown> | null = null;

  misPermisosPaso1:    Permiso[] = [];
  loadingPerfilesPaso1 = false;

  // ── Filtros unificados ───────────────────────────────────────
  verFiltro:    'propias' | 'subordinados' | 'todas' = 'propias';
  estadoFiltro: 'todas' | 'abiertas' | 'cerradas' | 'enviadas' | 'aprobadas' | 'sincronizadas' | 'error' = 'todas';

  // Datos combinados en la vista
  rendicionesSubordinados: RendM[] = [];
  totalSubordinados        = 0;
  pageSubordinados         = 1;
  totalPagesSubordinados   = 1;
  loadingSubordinados      = false;

  showPerfilPicker   = false;
  misPermisos:       Permiso[] = [];
  loadingMisPerfiles = false;
  perfilPickerSelId: number | null = null;

  /** Items para el PickerModalComponent */
  get perfilPickerItems(): PickerItem[] {
    return this.misPermisos.map(p => ({
      id: p.U_IDPERFIL,
      label: p.U_NOMBREPERFIL,
      icon: '🏷️'
    }));
  }

  perfilActivo:  Perfil  | null = null;
  permisoActivo: Permiso | null = null;

  perfiles:           Perfil[] = [];
  filtroEmpleado    = '';
  filtroEmpleadoCar = 'EMPIEZA';

  cuentasCabeceraActivas: CuentaCabecera[] = [];
  loadingCuentas   = false;
  cuentaEsAsociada   = 'Y';
  editingPerfilNombre = '';

  get tieneMultiplesCuentas(): boolean {
    return this.cuentasCabeceraActivas.length > 1;
  }

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  // ── Reimpresión desde lista (botón en tabla) ────────────────
  showPdfReprint     = false;
  pdfReprintRend:    RendM  | null = null;
  pdfReprintDocs:    RendD[] = [];
  loadingReprintDocs = false;

  // ── Modal sincronización (usando componente compartido) ──────
  syncRend: RendM | null = null;

  get isAdmin(): boolean    { return this.auth.isAdmin; }
  get fijarSaldo(): boolean { return this.auth.fijarSaldo; }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  constructor(
    private rendMService:           RendMService,
    private rendDSvc:               RendDService,
    private toast:                  ToastService,
    private fb:                     FormBuilder,
    public  auth:                   AuthService,
    private cdr:                    ChangeDetectorRef,
    private router:                 Router,
    private perfilesService:        PerfilesService,
    private permisosService:        PermisosService,
    private cuentasCabeceraService: CuentasCabeceraService,
    private aprobSvc:               AprobacionesService,
    private filterService:          RendicionFilterService,
    private integracionSvc:         IntegracionService,
    private dirtyService:           FormDirtyService,
    private confirmDialogService:   ConfirmDialogService,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
    Promise.resolve().then(() => {
      this.cargarPerfilesPaso1();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarPerfilesPaso1() {
    this.loadingPerfilesPaso1 = true;
    forkJoin({
      perfiles: this.perfilesService.getAll(),
      permisos: this.permisosService.getMisPerfiles(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ perfiles, permisos }) => {
        this.perfiles             = perfiles;
        this.misPermisosPaso1     = permisos;
        this.loadingPerfilesPaso1 = false;
        const perfilGuardado = sessionStorage.getItem('rendiciones_perfil_activo');
        if (perfilGuardado) {
          sessionStorage.removeItem('rendiciones_perfil_activo');
          const idPerfil = Number(perfilGuardado);
          const permiso = permisos.find(p => p.U_IDPERFIL === idPerfil);
          if (permiso) {
            this.misPermisos = permisos;
            this.seleccionarPerfilDirecto(permiso);  // Ya llama a load() internamente
            this.cdr.markForCheck();
            return;
          }
        }
        if (permisos.length === 1) {
          this.seleccionarPerfilDirecto(permisos[0]);  // Ya llama a load() internamente
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingPerfilesPaso1 = false;
        this.cdr.markForCheck();
      },
    });
  }

  private buildForm() {
    const montoValidators = this.auth.fijarSaldo
      ? [Validators.required, Validators.min(0.01)]
      : [Validators.min(0)];

    this.form = this.fb.group({
      idPerfil:       [null, [Validators.required]],
      cuenta:         ['',   [Validators.required, Validators.maxLength(25)]],
      nombreCuenta:   ['',   [Validators.required, Validators.maxLength(250)]],
      empleado:       ['',   [Validators.required, Validators.maxLength(25)]],
      nombreEmpleado: ['',   [Validators.required, Validators.maxLength(250)]],
      objetivo:       ['',   [Validators.required, Validators.maxLength(250)]],
      fechaIni:       ['',   [Validators.required]],
      fechaFinal:     ['',   [Validators.required]],
      monto:          [0,    montoValidators],
      preliminar:     ['',   Validators.maxLength(25)],
    });
  }

  fieldChanged(name: string): boolean {
    if (!this.editingRend || !this.initialValues) return false;
    return this.form.get(name)?.value !== this.initialValues[name];
  }

  private isLoadingData = false;
  private pendingLoadTimeout: any = null;

  load(onComplete?: () => void) {
    // Cancelar cualquier load() pendiente programado
    if (this.pendingLoadTimeout) {
      clearTimeout(this.pendingLoadTimeout);
      this.pendingLoadTimeout = null;
    }
    
    // Evitar llamadas múltiples simultáneas
    if (this.isLoadingData) {
      return;
    }
    
    this.isLoadingData = true;
    this.loading   = true;
    this.loadError = false;
    


    this.rendMService.getAll({
      idPerfil: this.perfilActivo?.U_CodPerfil,
      estados:  this.filterService.estadosNumericos(),
      page:     this.page,
      limit:    this.limit,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.rendiciones = result.data;
        this.filtered    = result.data;
        this.paged       = result.data;
        this.totalPages  = result.totalPages;
        this.loading     = false;
        this.isLoadingData = false;
        
        // Sincronizar con el servicio de filtros
        this.filterService.setRendiciones(result.data);
        this.applyLocalFilter();
        
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loading     = false;
        this.isLoadingData = false;
        this.loadError   = true;
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  // ── Carga unificada de subordinados ──────────────────────────────────

  loadSubordinados(onComplete?: () => void) {
    if (!this.auth.esAprobador && !this.auth.sinAprobador && !this.auth.isAdmin) return;
    this.loadingSubordinados = true;
    this.cdr.markForCheck();

    this.rendMService.getSubordinados({
      estados:  this.filterService.estadosNumericos(),
      idPerfil: this.perfilActivo?.U_CodPerfil,
      page:     this.pageSubordinados,
      limit:    this.limit,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.rendicionesSubordinados = result.data;
        this.totalSubordinados       = result.total;
        this.totalPagesSubordinados  = result.totalPages;
        this.loadingSubordinados     = false;
        
        // Sincronizar con el servicio de filtros
        this.filterService.setRendicionesSubordinados(result.data);
        
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loadingSubordinados = false;
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  /** Convierte el filtro de estado en array de números para el backend */
  private _estadosNumericos(): number[] {
    switch (this.estadoFiltro) {
      case 'abiertas':     return [1];
      case 'cerradas':     return [2];
      case 'enviadas':     return [4];
      case 'aprobadas':    return [3];
      case 'sincronizadas':return [5];
      case 'error':        return [6];
      default:             return [];
    }
  }

  /** Cambia el filtro "Ver" y recarga los datos necesarios */
  onVerFiltroChange(ver: 'propias' | 'subordinados' | 'todas') {
    this.verFiltro = ver;
    this.filterService.setVerFiltro(ver);
    this.page             = 1;
    this.pageSubordinados = 1;
    if (ver === 'propias')       { this.load(); }
    else if (ver === 'subordinados') { this.loadSubordinados(); }
    else                         { this.load(); this.loadSubordinados(); }
    this.cdr.markForCheck();
  }

  /** Cambia el filtro de estado y recarga según vista activa */
  onEstadoFiltroChange(estado: string) {
    this.estadoFiltro = estado as any;
    this.filterService.setEstadoFiltro(estado as any);
    this.page             = 1;
    this.pageSubordinados = 1;
    if (this.verFiltro !== 'subordinados') this.load();
    if (this.verFiltro !== 'propias')      this.loadSubordinados();
    this.cdr.markForCheck();
  }

  onPageSubordinadosChange(p: number) { this.pageSubordinados = p; this.loadSubordinados(); }

  applyLocalFilter() {
    const q = this.search.toLowerCase();
    let base = this.rendiciones;
    if      (this.estadoFiltro === 'abiertas')      base = base.filter(r => r.U_Estado === 1);
    else if (this.estadoFiltro === 'cerradas')       base = base.filter(r => r.U_Estado === 2);
    else if (this.estadoFiltro === 'enviadas')       base = base.filter(r => r.U_Estado === 4);
    else if (this.estadoFiltro === 'aprobadas')      base = base.filter(r => r.U_Estado === 7);
    else if (this.estadoFiltro === 'sincronizadas')  base = base.filter(r => r.U_Estado === 5);
    else if (this.estadoFiltro === 'error')          base = base.filter(r => r.U_Estado === 6);
    this.filtered = base.filter(r =>
      (r.U_Objetivo       ?? '').toLowerCase().includes(q) ||
      (r.U_NombreEmpleado ?? '').toLowerCase().includes(q) ||
      (r.U_NombreCuenta   ?? '').toLowerCase().includes(q) ||
      (r.U_NombrePerfil   ?? '').toLowerCase().includes(q),
    );
    this.paged = this.filtered;
  }

  onSearchChange(value: string) {
    this.search = value;
    this.applyFilter();
  }

  onSearchCleared() {
    this.search = '';
    this.applyFilter();
  }

  applyFilter() {
    this.page = 1;
    this.load();
  }

  /** Retrocompatibilidad — ahora delegamos a onEstadoFiltroChange */
  setEstadoFiltro(valor: string) {
    this.onEstadoFiltroChange(valor);
  }

  updatePaging() {
    this.paged = this.filtered;
  }

  onPageChange(p: number)  { this.page = p; this.load(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.load(); }

  // ── Menú de acciones (ActionMenuComponent) ──────────────────
  getActionMenuItems(r: RendM): ActionMenuItem[] {
    const items: ActionMenuItem[] = [];
    
    // Ver detalle - siempre visible
    items.push({ id: 'view', label: 'Ver detalle', icon: ICON_VIEW });
    
    // Imprimir
    if (this.canReprint(r)) {
      items.push({ id: 'print', label: 'Ver/Imprimir comprobante', icon: ICON_PRINT });
    }
    
    // Editar
    if (this.canEdit(r)) {
      items.push({ id: 'edit', label: 'Editar', icon: ICON_EDIT });
    }
    
    // Sincronizar / Enviar / Preliminar
    if (r.U_Estado === 1 && this.canEdit(r)) {
      if (this.canSyncDirecto(r)) {
        items.push({ id: 'sync', label: 'Sincronizar', cssClass: 'text-success', icon: ICON_SYNC });
      } else if (this.auth.nomSup) {
        items.push({ id: 'send', label: 'Enviar', cssClass: 'text-primary', icon: ICON_SEND });
      }
    }
    
    // Reintentar sincronización: estado ERROR_SYNC (6)
    if (r.U_Estado === 6 && this.canSyncDirecto(r)) {
      items.push({ id: 'retry-sync', label: 'Reintentar Sincronización', cssClass: 'text-warning', icon: ICON_RETRY_SYNC });
    }
    
    // Eliminar (con divider antes)
    if (this.canDelete(r)) {
      items.push({ id: 'delete', label: 'Eliminar', cssClass: 'text-danger', divider: true, icon: ICON_TRASH });
    }
    
    return items;
  }

  onActionClick(actionId: string, r: RendM) {
    switch (actionId) {
      case 'view':
        this.router.navigate(['/rend-m', r.U_IdRendicion, 'detalle']);
        break;
      case 'print':
        this.reimprimir(r);
        break;
      case 'edit':
        this.openEdit(r);
        break;
      case 'sync':
      case 'retry-sync':
        this.abrirModalSync(r);
        break;
      case 'preliminar':
        this.generarPreliminar(r);
        break;
      case 'send':
        this.enviarAprobacion(r);
        break;
      case 'delete':
        this.confirmDelete(r);
        break;
    }
  }

  // ── Menú de acciones para subordinados ───────────────────────
  getActionMenuItemsSubordinados = (r: RendM): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [];
    
    // Ver detalle - siempre visible
    items.push({ id: 'view', label: 'Ver detalle', icon: ICON_VIEW });

    // Imprimir
    if (this.canReprint(r)) {
      items.push({ id: 'print', label: 'Ver/Imprimir comprobante', icon: ICON_PRINT });
    }

    // Editar
    if (this.canEdit(r)) {
      items.push({ id: 'edit', label: 'Editar', icon: ICON_EDIT });
    }

    // Sincronizar: si la rendición es propia y el usuario puede sincronizar directo
    if (r.U_Estado === 1 && this.canSyncDirecto(r) && r.U_IdUsuario === String(this.auth.user?.sub)) {
      items.push({ id: 'sync', label: 'Sincronizar', cssClass: 'text-success', icon: ICON_SYNC });
    }

    // Reintentar sincronización: estado ERROR_SYNC (6) en rendición propia
    if (r.U_Estado === 6 && this.canSyncDirecto(r) && r.U_IdUsuario === String(this.auth.user?.sub)) {
      items.push({ id: 'retry-sync', label: 'Reintentar Sincronización', cssClass: 'text-warning', icon: ICON_RETRY_SYNC });
    }

    // Aprobar/Rechazar (con divider antes)
    if (this.canAprobar(r)) {
      items.push({ id: 'aprobar', label: 'Aprobar', cssClass: 'text-success', divider: true, icon: ICON_CHECK });
      items.push({ id: 'rechazar', label: 'Rechazar', cssClass: 'text-danger', icon: ICON_CLOSE });
    }
    
    return items;
  }

  onActionClickSubordinados(actionId: string, r: RendM) {
    switch (actionId) {
      case 'view':
        this.router.navigate(['/rend-m', r.U_IdRendicion, 'detalle']);
        break;
      case 'print':
        this.reimprimir(r);
        break;
      case 'edit':
        this.router.navigate(['/rend-m', r.U_IdRendicion, 'detalle']);
        break;
      case 'aprobar':
        this.aprobarDesdeSubordinados(r);
        break;
      case 'rechazar':
        this.rechazarDesdeSubordinados(r);
        break;
      case 'sync':
      case 'retry-sync':
        this.abrirModalSync(r);
        break;
    }
  }

  openPerfilPicker() {
    this.perfilPickerSelId  = this.perfilActivo?.U_CodPerfil ?? null;
    this.misPermisos        = [];
    this.loadingMisPerfiles = true;
    this.showPerfilPicker   = true;
    this.cdr.markForCheck();

    this.permisosService.getMisPerfiles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.misPermisos        = data;
        this.loadingMisPerfiles = false;
        if (data.length === 1 && !this.perfilPickerSelId) {
          this.perfilPickerSelId = data[0].U_IDPERFIL;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingMisPerfiles = false;
        this.showPerfilPicker   = false;
        this.cdr.markForCheck();
      },
    });
  }

  cancelPerfilPicker() {
    this.showPerfilPicker  = false;
    this.perfilPickerSelId = null;
    this.cdr.markForCheck();
  }

  seleccionarPerfilDirecto(permiso: Permiso) {
    this.permisoActivo     = permiso;
    this.perfilActivo      = this.perfiles.find(p => p.U_CodPerfil === permiso.U_IDPERFIL) ?? null;
    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';
    this.estadoFiltro      = 'todas';
    this.verFiltro         = 'propias';
    this.filterService.setEstadoFiltro('todas');
    this.filterService.setVerFiltro('propias');
    this.search            = '';
    this.applyFilter();
    this.cdr.markForCheck();
  }

  onPerfilConfirm(id: number | string): void {
    this.perfilPickerSelId = id as number;
    this.confirmarPerfilPicker();
  }

  confirmarPerfilPicker() {
    if (!this.perfilPickerSelId) return;
    this.permisoActivo = this.misPermisos.find(p => p.U_IDPERFIL === this.perfilPickerSelId) ?? null;
    this.perfilActivo  = this.perfiles.find(p => p.U_CodPerfil === this.perfilPickerSelId) ?? null;
    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';
    this.showPerfilPicker  = false;
    this.estadoFiltro      = 'todas';
    this.verFiltro         = 'propias';
    this.filterService.setEstadoFiltro('todas');
    this.filterService.setVerFiltro('propias');
    this.search            = '';
    this.load();
    this.cdr.markForCheck();
  }

  limpiarPerfilActivo() {
    this.perfilActivo      = null;
    this.permisoActivo     = null;
    this.filtroEmpleado    = '';
    this.filtroEmpleadoCar = 'EMPIEZA';
    this.search            = '';
    this.applyFilter();
    this.cdr.markForCheck();
  }

  openNew() {
    this.editingRend   = null;
    this.initialValues = null;
    this.form.get('idPerfil')?.disable();

    const hoy = new Date().toISOString().substring(0, 10);

    this.form.get('cuenta')?.disable();
    this.form.get('nombreCuenta')?.disable();

    const idPerfil = this.perfilActivo?.U_CodPerfil;
    if (idPerfil) {
      this.loadingCuentas = true;
      this.cdr.markForCheck();
      this.cuentasCabeceraService.getByPerfil(idPerfil).pipe(takeUntil(this.destroy$)).subscribe({
        next: (cuentas) => {
          this.cuentasCabeceraActivas = cuentas;
          this.loadingCuentas = false;
          const cuenta           = cuentas.length > 0 ? cuentas[0] : null;
          const prefijo          = cuenta?.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
          const nombreCuentaFull = cuenta
            ? `${prefijo}-${cuenta.U_CuentaFormatCode || cuenta.U_CuentaSys} — ${cuenta.U_CuentaNombre}`
            : '';

          if (cuentas.length > 1) {
            this.form.get('cuenta')?.enable();
            this.form.get('nombreCuenta')?.enable();
          }

          this.cuentaEsAsociada = cuenta?.U_CuentaAsociada ?? 'Y';
          this.aplicarBloqueoEmpleado();

          // Habilitar temporalmente para que form.reset() asigne valores.
          // Los controles disabled ignoran los valores pasados en reset()
          this.form.get('cuenta')?.enable({ emitEvent: false });
          this.form.get('nombreCuenta')?.enable({ emitEvent: false });

          this.form.reset({
            idPerfil,
            cuenta:       (cuenta?.U_CuentaFormatCode || cuenta?.U_CuentaSys) ?? '',
            nombreCuenta: nombreCuentaFull,
            empleado: '', nombreEmpleado: '', objetivo: '',
            fechaIni: hoy, fechaFinal: hoy, monto: 0, preliminar: '',
          });

          // Volver a deshabilitar si solo hay una cuenta
          if (cuentas.length <= 1) {
            this.form.get('cuenta')?.disable({ emitEvent: false });
            this.form.get('nombreCuenta')?.disable({ emitEvent: false });
          }

          // Abrir el modal después de que las cuentas estén cargadas
          this.showForm = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingCuentas = false;
          this.cuentaEsAsociada = 'Y';
          this.aplicarBloqueoEmpleado();
          this.form.reset({
            idPerfil, cuenta: '', nombreCuenta: '',
            empleado: '', nombreEmpleado: '', objetivo: '',
            fechaIni: hoy, fechaFinal: hoy, monto: 0, preliminar: '',
          });
          this.showForm = true;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.cuentaEsAsociada = 'Y';
      this.aplicarBloqueoEmpleado();
      this.form.reset({
        idPerfil: null, cuenta: '', nombreCuenta: '',
        empleado: '', nombreEmpleado: '', objetivo: '',
        fechaIni: hoy, fechaFinal: hoy, monto: 0, preliminar: '',
      });
      this.showForm = true;
      this.cdr.markForCheck();
    }
  }

  private aplicarBloqueoEmpleado() {
    const empleadoCtrl       = this.form.get('empleado');
    const nombreEmpleadoCtrl = this.form.get('nombreEmpleado');

    if (this.cuentaEsAsociada === 'N') {
      empleadoCtrl?.disable();
      nombreEmpleadoCtrl?.disable();
      empleadoCtrl?.clearValidators();
      nombreEmpleadoCtrl?.clearValidators();
      this.form.patchValue({ empleado: '', nombreEmpleado: '' });
    } else {
      empleadoCtrl?.enable();
      nombreEmpleadoCtrl?.enable();
      empleadoCtrl?.setValidators([Validators.required, Validators.maxLength(25)]);
      nombreEmpleadoCtrl?.setValidators([Validators.required, Validators.maxLength(250)]);
    }
    empleadoCtrl?.updateValueAndValidity();
    nombreEmpleadoCtrl?.updateValueAndValidity();
  }

  onPerfilChange(idPerfil: number | null) {
    const perfil      = this.perfiles.find(p => p.U_CodPerfil === Number(idPerfil));
    const nuevoFiltro = perfil?.U_EMP_TEXTO ?? '';
    const nuevoCar    = perfil?.U_EMP_CAR   ?? 'EMPIEZA';

    if (nuevoFiltro !== this.filtroEmpleado || nuevoCar !== this.filtroEmpleadoCar) {
      this.filtroEmpleado    = nuevoFiltro;
      this.filtroEmpleadoCar = nuevoCar;
      this.form.patchValue({ empleado: '', nombreEmpleado: '' });
    }
  }

  onCuentaChange(cuenta: CuentaCabecera | null) {
    if (!cuenta) return;
    const prefijo          = cuenta.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
    const nombreCuentaFull = `${prefijo}-${cuenta.U_CuentaFormatCode || cuenta.U_CuentaSys}${cuenta.U_CuentaNombre}`;
    this.cuentaEsAsociada  = cuenta.U_CuentaAsociada;
    this.form.patchValue({
      cuenta:         cuenta.U_CuentaFormatCode || cuenta.U_CuentaSys,
      nombreCuenta:   nombreCuentaFull,
      empleado:       '',
      nombreEmpleado: '',
    });
    this.aplicarBloqueoEmpleado();
    this.cdr.markForCheck();
  }

  onEmpleadoSelected(e: Empleado | null) {
    const nombreEmpleadoFull = e ? `${e.cardCode}-${e.cardName}` : '';
    this.form.patchValue({
      empleado:       e?.cardCode ?? '',
      nombreEmpleado: nombreEmpleadoFull,
    });
  }

  openEdit(r: RendM) {
    this.editingRend = r;

    this.form.get('idPerfil')?.disable();
    this.form.get('nombreCuenta')?.disable();

    const perfil               = this.perfiles.find(p => p.U_CodPerfil === r.U_IdPerfil);
    this.editingPerfilNombre   = perfil?.U_NombrePerfil ?? String(r.U_IdPerfil);
    this.filtroEmpleado        = perfil?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar     = perfil?.U_EMP_CAR   ?? 'EMPIEZA';

    const esNoAsociada    = r.U_NombreCuenta?.startsWith('CN-');
    this.cuentaEsAsociada = esNoAsociada ? 'N' : 'Y';
    this.aplicarBloqueoEmpleado();

    const values = {
      idPerfil:       r.U_IdPerfil,
      cuenta:         r.U_Cuenta,
      nombreCuenta:   r.U_NombreCuenta,
      empleado:       r.U_Empleado,
      nombreEmpleado: r.U_NombreEmpleado,
      objetivo:       r.U_Objetivo,
      fechaIni:       r.U_FechaIni?.substring(0, 10)   ?? '',
      fechaFinal:     r.U_FechaFinal?.substring(0, 10) ?? '',
      monto:          r.U_Monto,
      preliminar:     r.U_Preliminar ?? '',
    };
    this.form.reset(values);
    this.initialValues = { ...values };

    this.cuentasCabeceraActivas = [];
    this.cuentasCabeceraService.getByPerfil(r.U_IdPerfil).pipe(takeUntil(this.destroy$)).subscribe({
      next: (cuentas) => {
        this.cuentasCabeceraActivas = cuentas;
        if (cuentas.length > 1) {
          this.form.get('cuenta')?.enable();
        } else {
          this.form.get('cuenta')?.disable();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.form.get('cuenta')?.disable();
        this.cdr.markForCheck();
      },
    });

    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm               = false;
    this.editingRend            = null;
    this.initialValues          = null;
    this.cuentaEsAsociada       = 'Y';
    this.editingPerfilNombre    = '';
    this.cuentasCabeceraActivas = [];
    this.form.get('idPerfil')?.enable();
    this.form.get('cuenta')?.enable();
    this.form.get('nombreCuenta')?.enable();
    this.form.get('empleado')?.enable();
    this.form.get('nombreEmpleado')?.enable();
    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreateRendMPayload = {
      idPerfil:       Number(raw.idPerfil),
      cuenta:         raw.cuenta,
      nombreCuenta:   raw.nombreCuenta,
      cuentaAsociada: this.cuentaEsAsociada,
      empleado:       raw.empleado       || undefined,
      nombreEmpleado: raw.nombreEmpleado || undefined,
      objetivo:       raw.objetivo,
      fechaIni:       raw.fechaIni,
      fechaFinal:     raw.fechaFinal,
      monto:          Number(raw.monto),
      preliminar:     raw.preliminar ?? '',
    };

    if (this.editingRend) {
      this.rendMService.update(this.editingRend.U_IdRendicion, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Rendición actualizada');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      this.rendMService.create(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (rendicion) => {
          this.isSaving = false;
          this.toast.exito('Rendición creada');
          this.closeForm();
          this.router.navigate(['/rend-m', rendicion.U_IdRendicion, 'detalle']);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isSaving = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  confirmDelete(r: RendM) {
    this.confirmDialogService.ask({
      title:        '¿Eliminar rendición?',
      message:      `Se eliminará la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.rendMService.remove(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => { this.toast.exito('Rendición eliminada'); this.load(); },
        error: () => { this.toast.error('Error al eliminar la rendición'); this.cdr.markForCheck(); }
      });
    });
  }

  estadoTexto(estado: number): string { return this.estadoLabel[estado] ?? `Estado ${estado}`; }
  estadoCss(estado: number): string   { return this.estadoClass[estado] ?? 'badge-secondary'; }

  // ── Acciones sobre subordinados ─────────────────────────────────────────

  aprobarDesdeSubordinados(r: RendM) {
    this.confirmDialogService.ask({
      title:        '¿Aprobar esta rendición?',
      message:      `Rendición N° ${r.U_IdRendicion} de ${r.U_NomUsuario} — "${r.U_Objetivo}"`,
      confirmLabel: '✓ Aprobar',
      type:         'primary',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.aprobSvc.aprobar(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.toast.exito(res.message ?? 'Rendición aprobada');
          this.loadSubordinados();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al aprobar'),
      });
    });
  }

  rechazarDesdeSubordinados(r: RendM) {
    this.confirmDialogService.ask({
      title:        '¿Rechazar esta rendición?',
      message:      `La rendición N° ${r.U_IdRendicion} de ${r.U_NomUsuario} volverá al estado ABIERTO para correcciones.`,
      confirmLabel: '✗ Rechazar',
      type:         'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.aprobSvc.rechazar(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.toast.exito(res.message ?? 'Rendición rechazada — vuelve a ABIERTO');
          this.loadSubordinados();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al rechazar'),
      });
    });
  }

  // ── Enviar con vista previa PDF ──────────────────────────────────────────

  enviarAprobacion(r: RendM) {
    this.confirmDialogService.ask({
      title:        '¿Enviar para aprobación?',
      message:      `La rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" será enviada a los aprobadores configurados.`,
      confirmLabel: 'Sí, enviar',
      type:         'primary',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.aprobSvc.enviar(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.toast.exito(res.message ?? 'Rendición enviada para aprobación');
          this.load();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al enviar'),
      });
    });
  }

  generarPreliminar(r: RendM) {
    this.confirmDialogService.ask({
      title:        '¿Generar documento preliminar?',
      message:      `Se generará el preliminar para la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" y quedará aprobada.`,
      confirmLabel: 'Sí, generar',
      type:         'primary',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.aprobSvc.enviar(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => {
          this.toast.exito(res.message ?? 'Preliminar generado — rendición aprobada');
          this.load();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al generar preliminar'),
      });
    });
  }

  // ── Reimpresión (para rendiciones ya enviadas) ───────────────────────────

  reimprimir(r: RendM) {
    this.pdfReprintRend    = r;
    this.pdfReprintDocs    = [];
    this.loadingReprintDocs = true;
    this.showPdfReprint    = true;
    this.cdr.markForCheck();

    this.rendDSvc.getAll(r.U_IdRendicion).pipe(takeUntil(this.destroy$)).subscribe({
      next: (docs) => {
        this.pdfReprintDocs    = docs;
        this.loadingReprintDocs = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingReprintDocs = false;
        this.cdr.markForCheck();
      },
    });
  }

  onPdfReprintClose() {
    this.showPdfReprint  = false;
    this.pdfReprintRend  = null;
    this.pdfReprintDocs  = [];
    this.cdr.markForCheck();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  canEdit(r: RendM): boolean {
    if (this.isAdmin) return true;
    // Dueño puede editar sus propias en estado ABIERTO
    if (r.U_IdUsuario === String(this.auth.user?.sub) && r.U_Estado === 1) return true;
    // Aprobador puede editar rendiciones de subordinados en estado ENVIADO
    if (this.auth.esAprobador && r.U_Estado === 4) return true;
    return false;
  }

  canDelete(r: RendM): boolean {
    if (this.isAdmin) return true;
    return r.U_IdUsuario === String(this.auth.user?.sub) && r.U_Estado === 1;
  }

  canAprobar(r: RendM): boolean {
    // Solo aprobadores pueden aprobar, y solo en estado ENVIADO
    return this.auth.esAprobador && r.U_Estado === 4;
  }

  canSync(r: RendM): boolean {
    // Usuarios con puedeSync: estados APROBADO (7) o ERROR_SYNC (6)
    if (this.auth.puedeSync && [7, 6].includes(r.U_Estado)) {
      return true;
    }
    // Usuarios con genDocPre o esAprobador y sin aprobador propio: también sincronizan desde ABIERTO (1)
    if ((this.auth.puedeGenerarPre || this.auth.esAprobador) && this.auth.sinAprobador && [1, 7, 6].includes(r.U_Estado)) {
      return true;
    }
    return false;
  }

  /** 
   * Verifica si puede sincronizar directamente (sin enviar a aprobación).
   * Estado 1 (ABIERTO): sincronización inicial
   * Estado 6 (ERROR_SYNC): reintentar sincronización después de error
   */
  canSyncDirecto(r: RendM): boolean {
    // Puede sincronizar directamente si:
    // - Es admin, O es aprobador de alguien, O no tiene aprobador configurado
    // - Y además tiene genDocPre habilitado (puedeGenerarPre)
    const tieneRolSync = this.auth.isAdmin || this.auth.esAprobador || this.auth.sinAprobador;
    return tieneRolSync && this.auth.puedeGenerarPre && [1, 6].includes(r.U_Estado);
  }

  /** Muestra el botón reimprimir para rendiciones ya enviadas/aprobadas/sync */
  canReprint(r: RendM): boolean {
    return [2, 3, 4, 5, 6].includes(r.U_Estado);
  }

  // ── Modal sincronización (usando componente compartido) ───────────────
  
  abrirModalSync(rend: RendM) {
    this.syncRend = rend;
    this.syncModal?.open({
      idRendicion: rend.U_IdRendicion,
      objetivo: rend.U_Objetivo,
      monto: rend.U_Monto,
      estado: rend.U_Estado,
    });
  }

  onSyncComplete(_res: SyncResult) {
    this.load();
  }

  // ── Track by para virtual scroll ───────────────────────────────────────
  trackByRendicion(index: number, r: RendM): number {
    return r.U_IdRendicion;
  }

  // ── Handlers para componentes dumb ───────────────────────────────────────

  onSaveRendicion(data: RendicionFormData): void {
    this.form.patchValue({
      idPerfil: data.idPerfil,
      cuenta: data.cuenta,
      nombreCuenta: data.nombreCuenta,
      empleado: data.empleado,
      nombreEmpleado: data.nombreEmpleado,
      objetivo: data.objetivo,
      fechaIni: data.fechaIni,
      fechaFinal: data.fechaFinal,
      monto: data.monto,
      preliminar: data.preliminar,
    });
    this.save();
  }

  onTableAction(event: RendicionAction): void {
    const { action, rendicion } = event;
    this.onActionClick(action, rendicion);
  }
}
