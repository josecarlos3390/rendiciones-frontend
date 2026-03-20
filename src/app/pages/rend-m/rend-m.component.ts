import { RouterModule, Router } from '@angular/router';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { RendMService } from './rend-m.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AuthService } from '../../auth/auth.service';
import { PerfilesService } from '../perfiles/perfiles.service';
import { PermisosService } from '../permisos/permisos.service';
import { CuentasCabeceraService } from '../cuentas-cabecera/cuentas-cabecera.service';
import { CuentaCabecera } from '../../models/cuenta-cabecera.model';
import { Perfil } from '../../models/perfil.model';
import { Permiso } from '../../models/permiso.model';
import { EmpleadoSearchComponent, Empleado } from '../../shared/empleado-search/empleado-search.component';
import { CuentaCabeceraSelectComponent } from '../../shared/cuenta-cabecera-select/cuenta-cabecera-select.component';
import { DdmmyyyyPipe } from '../../shared/ddmmyyyy.pipe';
import {
  RendM, CreateRendMPayload,
  ESTADO_LABEL, ESTADO_CLASS,
} from '../../models/rend-m.model';

@Component({
  standalone: true,
  selector: 'app-rend-m',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
            ConfirmDialogComponent, PaginatorComponent, EmpleadoSearchComponent,
            CuentaCabeceraSelectComponent, DdmmyyyyPipe],
  templateUrl: './rend-m.component.html',
  styleUrls: ['./rend-m.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  estadoFiltro: 'abiertas' | 'enviadas' | 'todas' = 'abiertas';

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

  get isAdmin(): boolean    { return this.auth.isAdmin; }
  get fijarSaldo(): boolean { return this.auth.fijarSaldo; }

  get isDirty(): boolean {
    if (!this.editingRend || !this.initialValues) return true;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
  }

  constructor(
    private rendMService:           RendMService,
    private toast:                  ToastService,
    private fb:                     FormBuilder,
    private auth:                   AuthService,
    private cdr:                    ChangeDetectorRef,
    private router:                 Router,
    private perfilesService:        PerfilesService,
    private permisosService:        PermisosService,
    private cuentasCabeceraService: CuentasCabeceraService,
  ) {}

  ngOnInit() {
    this.buildForm();
    Promise.resolve().then(() => {
      this.cargarPerfilesPaso1();
    });
  }

  /**
   * Carga en paralelo perfiles completos y permisos del usuario con forkJoin.
   * Garantiza que this.perfiles esté poblado antes de intentar auto-seleccionar,
   * eliminando la race condition que impedía mostrar los perfiles en el paso 1.
   */
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
        if (permisos.length === 1) {
          this.seleccionarPerfilDirecto(permisos[0]);
          // Recargar con el perfil ya activo
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
        // El backend ya pagina — guardamos data y metadatos
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

  /**
   * Filtro local — solo aplica búsqueda de texto y estado sobre
   * los datos ya paginados que devolvió el backend.
   * El filtro por perfil y usuario lo hace el backend.
   */
  applyLocalFilter() {
    const q = this.search.toLowerCase();

    let base = this.rendiciones;

    if (this.estadoFiltro === 'abiertas') {
      base = base.filter(r => r.U_Estado === 1);
    } else if (this.estadoFiltro === 'enviadas') {
      base = base.filter(r => r.U_Estado === 4);
    }

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

  setEstadoFiltro(valor: 'abiertas' | 'enviadas' | 'todas') {
    this.estadoFiltro = valor;
    this.applyLocalFilter();
    this.cdr.markForCheck();
  }

  updatePaging() {
    // La paginación ahora la controla el backend — este método
    // se mantiene por compatibilidad con el PaginatorComponent
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
    this.estadoFiltro      = 'abiertas';
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
    this.estadoFiltro      = 'abiertas';
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
            ? `${prefijo}-${cuenta.U_CuentaFormatCode}${cuenta.U_CuentaNombre}`
            : '';

          if (cuentas.length > 1) {
            this.form.get('cuenta')?.enable();
            this.form.get('nombreCuenta')?.enable();
          }

          this.cuentaEsAsociada = cuenta?.U_CuentaAsociada ?? 'Y';
          this.aplicarBloqueoEmpleado();

          this.form.reset({
            idPerfil, cuenta: cuenta?.U_CuentaFormatCode ?? '',
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
    const nombreCuentaFull = `${prefijo}-${cuenta.U_CuentaFormatCode}${cuenta.U_CuentaNombre}`;
    this.cuentaEsAsociada  = cuenta.U_CuentaAsociada;
    this.form.patchValue({
      cuenta:         cuenta.U_CuentaFormatCode,
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
          // Navegar directamente al detalle para empezar a agregar líneas
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

  canEdit(r: RendM): boolean {
    if (this.isAdmin) return true;
    return r.U_IdUsuario === String(this.auth.user?.sub) && r.U_Estado === 1;
  }
  canDelete(r: RendM): boolean { return this.canEdit(r); }
}