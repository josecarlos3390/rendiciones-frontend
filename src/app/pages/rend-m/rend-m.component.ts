import { RouterModule, Router } from '@angular/router';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AprobacionesService }    from '../../services/aprobaciones.service';
import { RendMService }           from './rend-m.service';
import { RendDService }           from '../rend-d/rend-d.service';
import { ToastService }           from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent }     from '../../shared/paginator/paginator.component';
import { AuthService }            from '../../auth/auth.service';
import { PerfilesService }        from '../perfiles/perfiles.service';
import { PermisosService }        from '../permisos/permisos.service';
import { CuentasCabeceraService } from '../cuentas-cabecera/cuentas-cabecera.service';
import { CuentaCabecera }         from '../../models/cuenta-cabecera.model';
import { Perfil }                 from '../../models/perfil.model';
import { Permiso }                from '../../models/permiso.model';
import { EmpleadoSearchComponent, Empleado } from '../../shared/empleado-search/empleado-search.component';
import { CuentaCabeceraSelectComponent }     from '../../shared/cuenta-cabecera-select/cuenta-cabecera-select.component';
import { DdmmyyyyPipe }           from '../../shared/ddmmyyyy.pipe';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader/skeleton-loader.component';
import { RendicionPdfPreviewComponent } from '../../shared/rendicion-pdf/rendicion-pdf-preview.component';
import {
  RendM, CreateRendMPayload,
  ESTADO_LABEL, ESTADO_CLASS,
} from '../../models/rend-m.model';
import { RendD } from '../../models/rend-d.model';

@Component({
  standalone: true,
  selector: 'app-rend-m',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
            ConfirmDialogComponent, PaginatorComponent, EmpleadoSearchComponent,
            CuentaCabeceraSelectComponent, DdmmyyyyPipe, SkeletonLoaderComponent,
            RendicionPdfPreviewComponent],
  templateUrl: './rend-m.component.html',
  styleUrls: ['./rend-m.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RendMComponent implements OnInit {

  @ViewChild(EmpleadoSearchComponent) empleadoSearch?: EmpleadoSearchComponent;

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
  private initialValues: any = null;

  misPermisosPaso1:    Permiso[] = [];
  loadingPerfilesPaso1 = false;

  // ── Filtros unificados ───────────────────────────────────────
  // "ver": qué rendiciones mostrar
  //   'propias'      → solo las del usuario logueado
  //   'subordinados' → solo las de su equipo
  //   'todas'        → propias + subordinados juntos (paginados por separado, mostrados juntos)
  verFiltro:    'propias' | 'subordinados' | 'todas' = 'propias';
  estadoFiltro: 'todas' | 'abiertas' | 'enviadas' | 'aprobadas' | 'sincronizadas' | 'error' = 'todas';

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

  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  readonly estadoLabel = ESTADO_LABEL;
  readonly estadoClass = ESTADO_CLASS;

  // ── Reimpresión desde lista (botón en tabla) ────────────────
  showPdfReprint     = false;
  pdfReprintRend:    RendM  | null = null;
  pdfReprintDocs:    RendD[] = [];
  loadingReprintDocs = false;

  get isAdmin(): boolean    { return this.auth.isAdmin; }
  get fijarSaldo(): boolean { return this.auth.fijarSaldo; }

  get isDirty(): boolean {
    if (!this.editingRend || !this.initialValues) return true;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
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
  ) {}

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    Promise.resolve().then(() => {
      this.cargarPerfilesPaso1();
    });
  }

  private cargarPerfilesPaso1() {
    this.loadingPerfilesPaso1 = true;
    forkJoin({
      perfiles: this.perfilesService.getAll(),
      permisos: this.permisosService.getMisPerfiles(),
    }).subscribe({
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
            this.seleccionarPerfilDirecto(permiso);
            this.load();
            this.cdr.markForCheck();
            return;
          }
        }
        if (permisos.length === 1) {
          this.seleccionarPerfilDirecto(permisos[0]);
          this.load();
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

  load(onComplete?: () => void) {
    this.loading   = true;
    this.loadError = false;

    this.rendMService.getAll({
      idPerfil: this.perfilActivo?.U_CodPerfil,
      page:     this.page,
      limit:    this.limit,
    }).subscribe({
      next: (result) => {
        this.rendiciones = result.data;
        this.filtered    = result.data;
        this.paged       = result.data;
        this.totalPages  = result.totalPages;
        this.loading     = false;
        this.applyLocalFilter();
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
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
      estados:  this._estadosNumericos(),
      idPerfil: this.perfilActivo?.U_CodPerfil,
      page:     this.pageSubordinados,
      limit:    this.limit,
    }).subscribe({
      next: (result) => {
        this.rendicionesSubordinados = result.data;
        this.totalSubordinados       = result.total;
        this.totalPagesSubordinados  = result.totalPages;
        this.loadingSubordinados     = false;
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
      case 'enviadas':     return [4];
      case 'aprobadas':    return [3];
      case 'sincronizadas':return [5];
      case 'error':        return [6];
      default:             return [];
    }
  }

  /** Cambia el filtro "Ver" y recarga los datos necesarios */
  onVerFiltroChange(ver: 'propias' | 'subordinados' | 'todas') {
    this.verFiltro        = ver;
    this.page             = 1;
    this.pageSubordinados = 1;
    if (ver === 'propias')       { this.load(); }
    else if (ver === 'subordinados') { this.loadSubordinados(); }
    else                         { this.load(); this.loadSubordinados(); }
    this.cdr.markForCheck();
  }

  /** Cambia el filtro de estado y recarga según vista activa */
  onEstadoFiltroChange(estado: string) {
    this.estadoFiltro     = estado as any;
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
    else if (this.estadoFiltro === 'enviadas')       base = base.filter(r => r.U_Estado === 4);
    else if (this.estadoFiltro === 'aprobadas')      base = base.filter(r => r.U_Estado === 3);
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

  openPerfilPicker() {
    this.perfilPickerSelId  = this.perfilActivo?.U_CodPerfil ?? null;
    this.misPermisos        = [];
    this.loadingMisPerfiles = true;
    this.showPerfilPicker   = true;
    this.cdr.markForCheck();

    this.permisosService.getMisPerfiles().subscribe({
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
    this.search            = '';
    this.applyFilter();
    this.cdr.markForCheck();
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
    this.empleadoSearch?.reset();
    this.form.get('idPerfil')?.disable();

    const hoy = new Date().toISOString().substring(0, 10);

    this.form.get('cuenta')?.disable();
    this.form.get('nombreCuenta')?.disable();

    const idPerfil = this.perfilActivo?.U_CodPerfil;
    if (idPerfil) {
      this.cuentasCabeceraService.getByPerfil(idPerfil).subscribe({
        next: (cuentas) => {
          this.cuentasCabeceraActivas = cuentas;
          const cuenta           = cuentas.length > 0 ? cuentas[0] : null;
          const prefijo          = cuenta?.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
          const nombreCuentaFull = cuenta
            ? `${prefijo}-${cuenta.U_CuentaFormatCode || cuenta.U_CuentaSys}${cuenta.U_CuentaNombre}`
            : '';

          if (cuentas.length > 1) {
            this.form.get('cuenta')?.enable();
            this.form.get('nombreCuenta')?.enable();
          }

          this.cuentaEsAsociada = cuenta?.U_CuentaAsociada ?? 'Y';
          this.aplicarBloqueoEmpleado();

          this.form.reset({
            idPerfil, cuenta: (cuenta?.U_CuentaFormatCode || cuenta?.U_CuentaSys) ?? '',
            nombreCuenta: nombreCuentaFull,
            empleado: '', nombreEmpleado: '', objetivo: '',
            fechaIni: hoy, fechaFinal: hoy, monto: 0, preliminar: '',
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.cuentaEsAsociada = 'Y';
          this.aplicarBloqueoEmpleado();
          this.form.reset({
            idPerfil, cuenta: '', nombreCuenta: '',
            empleado: '', nombreEmpleado: '', objetivo: '',
            fechaIni: hoy, fechaFinal: hoy, monto: 0, preliminar: '',
          });
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
    }

    this.showForm = true;
    this.cdr.markForCheck();
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
      this.empleadoSearch?.reset();
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
      this.empleadoSearch?.reset();
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
    this.empleadoSearch?.reset();
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
    this.cuentasCabeceraService.getByPerfil(r.U_IdPerfil).subscribe({
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
      this.rendMService.update(this.editingRend.U_IdRendicion, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.success('Rendición actualizada');
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
      this.rendMService.create(payload).subscribe({
        next: (rendicion) => {
          this.isSaving = false;
          this.toast.success('Rendición creada');
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
    this.openDialog({
      title:        '¿Eliminar rendición?',
      message:      `Se eliminará la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.rendMService.remove(r.U_IdRendicion).subscribe({
        next:  () => { this.toast.success('Rendición eliminada'); this.load(); },
        error: () => { this.cdr.markForCheck(); },
      });
    });
  }

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  estadoTexto(estado: number): string { return this.estadoLabel[estado] ?? `Estado ${estado}`; }
  estadoCss(estado: number): string   { return this.estadoClass[estado] ?? 'badge-secondary'; }

  // ── Acciones sobre subordinados ─────────────────────────────────────────

  aprobarDesdeSubordinados(r: RendM) {
    this.openDialog({
      title:        '¿Aprobar esta rendición?',
      message:      `Rendición N° ${r.U_IdRendicion} de ${r.U_NomUsuario} — "${r.U_Objetivo}"`,
      confirmLabel: '✓ Aprobar',
      type:         'primary',
    }, () => {
      this.aprobSvc.aprobar(r.U_IdRendicion).subscribe({
        next: (res) => {
          this.toast.success(res.message ?? 'Rendición aprobada');
          this.loadSubordinados();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al aprobar'),
      });
    });
  }

  rechazarDesdeSubordinados(r: RendM) {
    this.openDialog({
      title:        '¿Rechazar esta rendición?',
      message:      `La rendición N° ${r.U_IdRendicion} de ${r.U_NomUsuario} volverá al estado ABIERTO para correcciones.`,
      confirmLabel: '✗ Rechazar',
      type:         'danger',
    }, () => {
      this.aprobSvc.rechazar(r.U_IdRendicion).subscribe({
        next: (res) => {
          this.toast.success(res.message ?? 'Rendición rechazada — vuelve a ABIERTO');
          this.loadSubordinados();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al rechazar'),
      });
    });
  }

  // ── Enviar con vista previa PDF ──────────────────────────────────────────

  enviarAprobacion(r: RendM) {
    this.openDialog({
      title:        '¿Enviar para aprobación?',
      message:      `La rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" será enviada a los aprobadores configurados.`,
      confirmLabel: 'Sí, enviar',
      type:         'primary',
    }, () => {
      this.aprobSvc.enviar(r.U_IdRendicion).subscribe({
        next: (res) => {
          this.toast.success(res.message ?? 'Rendición enviada para aprobación');
          this.load();
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'Error al enviar'),
      });
    });
  }

  generarPreliminar(r: RendM) {
    this.openDialog({
      title:        '¿Generar documento preliminar?',
      message:      `Se generará el preliminar para la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" y quedará aprobada.`,
      confirmLabel: 'Sí, generar',
      type:         'primary',
    }, () => {
      this.aprobSvc.enviar(r.U_IdRendicion).subscribe({
        next: (res) => {
          this.toast.success(res.message ?? 'Preliminar generado — rendición aprobada');
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

    this.rendDSvc.getAll(r.U_IdRendicion).subscribe({
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
    // Solo usuarios con permiso sync, en estado APROBADO o ERROR SYNC
    return this.auth.puedeSync && [3, 6].includes(r.U_Estado);
  }

  /** Muestra el botón reimprimir para rendiciones ya enviadas/aprobadas/sync */
  canReprint(r: RendM): boolean {
    return [2, 3, 4, 5, 6].includes(r.U_Estado);
  }
}