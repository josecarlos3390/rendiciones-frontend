import { RouterModule } from '@angular/router';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule,
  FormBuilder, FormGroup, Validators,
} from '@angular/forms';

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
import {
  RendM, CreateRendMPayload,
  ESTADO_LABEL, ESTADO_CLASS,
} from '../../models/rend-m.model';

@Component({
  standalone: true,
  selector: 'app-rend-m',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
            ConfirmDialogComponent, PaginatorComponent, EmpleadoSearchComponent],
  templateUrl: './rend-m.component.html',
  styleUrls: ['./rend-m.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RendMComponent implements OnInit {

  @ViewChild(EmpleadoSearchComponent) empleadoSearch?: EmpleadoSearchComponent;

  // ── Datos crudos y tabla ─────────────────────────────────
  rendiciones:  RendM[] = [];
  filtered:     RendM[] = [];
  paged:        RendM[] = [];
  search        = '';
  loading       = false;
  loadError     = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  // ── Formulario ───────────────────────────────────────────
  showForm       = false;
  editingRend:   RendM | null = null;
  isSaving       = false;
  form!:         FormGroup;
  private initialValues: any = null;

  // ── Paso 1: selección de perfil en pantalla (sin modal) ──
  misPermisosPaso1:     Permiso[] = [];
  loadingPerfilesPaso1  = false;

  // ── Filtro de estado ──────────────────────────────────────
  estadoFiltro: 'abiertas' | 'enviadas' | 'todas' = 'abiertas';

  // ── Modal selector de perfil ─────────────────────────────
  showPerfilPicker   = false;
  misPermisos:       Permiso[] = [];
  loadingMisPerfiles = false;
  perfilPickerSelId: number | null = null;

  // ── Perfil activo (seleccionado desde el picker) ─────────
  /** Perfil completo actualmente activo; null = vista global (ADMIN) */
  perfilActivo:      Perfil  | null = null;
  permisoActivo:     Permiso | null = null;   // para mostrar nombre en el badge

  // Perfiles completos y filtro de empleado
  perfiles:           Perfil[] = [];
  filtroEmpleado    = '';
  filtroEmpleadoCar = 'EMPIEZA';

  // Cuentas cabecera del perfil activo (para nueva rendición)
  cuentasCabeceraActivas: CuentaCabecera[] = [];
  loadingCuentas   = false;
  /** 'Y' = cuenta asociada a empleado, 'N' = cuenta NO asociada (empleado no aplica) */
  cuentaEsAsociada   = 'Y';
  /** Nombre del perfil al editar (para mostrar en el campo bloqueado) */
  editingPerfilNombre = '';

  // ── Confirm dialog ───────────────────────────────────────
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
    private rendMService:          RendMService,
    private toast:                 ToastService,
    private fb:                    FormBuilder,
    private auth:                  AuthService,
    private cdr:                   ChangeDetectorRef,
    private perfilesService:       PerfilesService,
    private permisosService:       PermisosService,
    private cuentasCabeceraService: CuentasCabeceraService,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
    this.loadPerfiles();
    this.cargarPerfilesPaso1();
  }

  private cargarPerfilesPaso1() {
    this.loadingPerfilesPaso1 = true;
    this.permisosService.getMisPerfiles().subscribe({
      next: (data) => {
        this.misPermisosPaso1     = data;
        this.loadingPerfilesPaso1 = false;
        // Si solo tiene un perfil, seleccionarlo automáticamente
        if (data.length === 1) {
          this.seleccionarPerfilDirecto(data[0]);
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loadingPerfilesPaso1 = false; },
    });
  }

  private loadPerfiles() {
    this.perfilesService.getAll().subscribe({
      next: (data) => { this.perfiles = data; this.cdr.markForCheck(); },
    });
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    // Si el usuario tiene fijarSaldo activo, monto es obligatorio (min 0.01)
    // Si no, monto es opcional (puede quedar en 0)
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

  // ── Carga y filtrado ─────────────────────────────────────

  load() {
    this.loading   = true;
    this.loadError = false;
    this.rendMService.getAll().subscribe({
      next: (data) => {
        this.rendiciones = data;
        this.loading     = false;
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.loadError = true; },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();

    // Filtrar por perfil activo (siempre presente en paso 2)
    let base = this.perfilActivo
      ? this.rendiciones.filter(r => r.U_IdPerfil === this.perfilActivo!.U_CodPerfil)
      : this.rendiciones;

    // Filtrar por usuario logueado (solo sus propias rendiciones)
    if (!this.isAdmin) {
      base = base.filter(r => r.U_IdUsuario === String(this.auth.user?.sub));
    }

    // Filtrar por estado
    if (this.estadoFiltro === 'abiertas') {
      base = base.filter(r => r.U_Estado === 1);
    } else if (this.estadoFiltro === 'enviadas') {
      base = base.filter(r => r.U_Estado === 4);
    }

    // Filtrar por búsqueda de texto
    this.filtered = base.filter(r =>
      (r.U_Objetivo       ?? '').toLowerCase().includes(q) ||
      (r.U_NombreEmpleado ?? '').toLowerCase().includes(q) ||
      (r.U_NombreCuenta   ?? '').toLowerCase().includes(q) ||
      (r.U_NombrePerfil   ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
  }

  setEstadoFiltro(valor: 'abiertas' | 'enviadas' | 'todas') {
    this.estadoFiltro = valor;
    this.applyFilter();
  }

  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start  = (this.page - 1) * this.limit;
    this.paged   = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Picker de perfil ─────────────────────────────────────

  /**
   * Abre el picker de perfil.
   * Si ya hay un perfil activo, lo preselecciona.
   */
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
        // Si solo tiene un perfil, preseleccionarlo
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
  }

  /** Selecciona un perfil directamente desde la pantalla del paso 1 */
  seleccionarPerfilDirecto(permiso: Permiso) {
    this.permisoActivo  = permiso;
    this.perfilActivo   = this.perfiles.find(p => p.U_CodPerfil === permiso.U_IDPERFIL) ?? null;
    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';
    this.estadoFiltro   = 'abiertas';
    this.search         = '';
    this.applyFilter();
    this.cdr.markForCheck();
  }

  /**
   * Confirma la selección del perfil desde el modal picker:
   * - Setea el perfil activo, resetea filtro de estado a 'abiertas'
   * - Re-filtra la tabla y cierra el picker
   */
  confirmarPerfilPicker() {
    if (!this.perfilPickerSelId) return;

    this.permisoActivo = this.misPermisos.find(p => p.U_IDPERFIL === this.perfilPickerSelId) ?? null;
    this.perfilActivo  = this.perfiles.find(p => p.U_CodPerfil === this.perfilPickerSelId) ?? null;

    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';

    this.showPerfilPicker = false;
    this.estadoFiltro     = 'abiertas';
    this.search           = '';
    this.applyFilter();
    this.cdr.markForCheck();
  }

  /** Limpia el perfil activo y vuelve a mostrar todas las rendiciones */
  limpiarPerfilActivo() {
    this.perfilActivo      = null;
    this.permisoActivo     = null;
    this.filtroEmpleado    = '';
    this.filtroEmpleadoCar = 'EMPIEZA';
    this.search            = '';
    this.applyFilter();
  }

  // ── Nueva rendición (desde la vista ya filtrada) ──────────

  /**
   * Abre el formulario de nueva rendición.
   * El perfil activo ya viene definido desde el picker.
   */
  openNew() {
    this.editingRend   = null;
    this.initialValues = null;
    this.empleadoSearch?.reset();
    this.form.get('idPerfil')?.disable();

    const hoy = new Date().toISOString().substring(0, 10);

    // cuenta y nombreCuenta se autocompletan del perfil — siempre readonly en nueva
    this.form.get('cuenta')?.disable();
    this.form.get('nombreCuenta')?.disable();

    const idPerfil = this.perfilActivo?.U_CodPerfil;
    if (idPerfil) {
      this.cuentasCabeceraService.getByPerfil(idPerfil).subscribe({
        next: (cuentas) => {
          const cuenta  = cuentas.length > 0 ? cuentas[0] : null;
          const prefijo = cuenta?.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
          const nombreCuentaFull = cuenta
            ? `${prefijo}-${cuenta.U_CuentaFormatCode}${cuenta.U_CuentaNombre}`
            : '';

          // Guardar si la cuenta es asociada y ajustar campos de empleado
          this.cuentaEsAsociada = cuenta?.U_CuentaAsociada ?? 'Y';
          this.aplicarBloqueoEmpleado();

          this.form.reset({
            idPerfil:       idPerfil,
            cuenta:         cuenta?.U_CuentaFormatCode ?? '',
            nombreCuenta:   nombreCuentaFull,
            empleado:       '',
            nombreEmpleado: '',
            objetivo:       '',
            fechaIni:       hoy,
            fechaFinal:     hoy,
            monto:          0,
            preliminar:     '',
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.cuentaEsAsociada = 'Y';
          this.aplicarBloqueoEmpleado();
          this.form.reset({
            idPerfil:       idPerfil,
            cuenta:         '',
            nombreCuenta:   '',
            empleado:       '',
            nombreEmpleado: '',
            objetivo:       '',
            fechaIni:       hoy,
            fechaFinal:     hoy,
            monto:          0,
            preliminar:     '',
          });
          this.cdr.markForCheck();
        },
      });
    } else {
      this.cuentaEsAsociada = 'Y';
      this.aplicarBloqueoEmpleado();
      this.form.reset({
        idPerfil:       null,
        cuenta:         '',
        nombreCuenta:   '',
        empleado:       '',
        nombreEmpleado: '',
        objetivo:       '',
        fechaIni:       hoy,
        fechaFinal:     hoy,
        monto:          0,
        preliminar:     '',
      });
    }

    this.showForm = true;
  }

  /** Bloquea o desbloquea los campos de empleado según si la cuenta es asociada */
  private aplicarBloqueoEmpleado() {
    const empleadoCtrl      = this.form.get('empleado');
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

  // ── Cambio manual de perfil dentro del form ───────────────

  onPerfilChange(idPerfil: number | null) {
    const perfil = this.perfiles.find(p => p.U_CodPerfil === Number(idPerfil));
    const nuevoFiltro = perfil?.U_EMP_TEXTO ?? '';
    const nuevoCar    = perfil?.U_EMP_CAR   ?? 'EMPIEZA';

    if (nuevoFiltro !== this.filtroEmpleado || nuevoCar !== this.filtroEmpleadoCar) {
      this.filtroEmpleado    = nuevoFiltro;
      this.filtroEmpleadoCar = nuevoCar;
      this.empleadoSearch?.reset();
      this.form.patchValue({ empleado: '', nombreEmpleado: '' });
    }
  }

  onEmpleadoSelected(e: Empleado | null) {
    const nombreEmpleadoFull = e ? `${e.cardCode}-${e.cardName}` : '';
    this.form.patchValue({
      empleado:       e?.cardCode ?? '',
      nombreEmpleado: nombreEmpleadoFull,
    });
  }

  // ── Modal de edición ─────────────────────────────────────

  openEdit(r: RendM) {
    this.editingRend = r;

    // Perfil, cuenta y nombreCuenta siempre bloqueados — no se pueden cambiar al editar
    this.form.get('idPerfil')?.disable();
    this.form.get('cuenta')?.disable();
    this.form.get('nombreCuenta')?.disable();

    const perfil = this.perfiles.find(p => p.U_CodPerfil === r.U_IdPerfil);
    this.editingPerfilNombre   = perfil?.U_NombrePerfil ?? String(r.U_IdPerfil);
    this.filtroEmpleado        = perfil?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar     = perfil?.U_EMP_CAR   ?? 'EMPIEZA';

    // Detectar si la cuenta es NO asociada por el prefijo CN- en el nombre guardado
    const esNoAsociada = r.U_NombreCuenta?.startsWith('CN-');
    this.cuentaEsAsociada = esNoAsociada ? 'N' : 'Y';
    this.aplicarBloqueoEmpleado();

    const values = {
      idPerfil:       r.U_IdPerfil,
      cuenta:         r.U_Cuenta,
      nombreCuenta:   r.U_NombreCuenta,
      empleado:       r.U_Empleado,
      nombreEmpleado: r.U_NombreEmpleado,
      objetivo:       r.U_Objetivo,
      fechaIni:       r.U_FechaIni?.substring(0, 10) ?? '',
      fechaFinal:     r.U_FechaFinal?.substring(0, 10) ?? '',
      monto:          r.U_Monto,
      preliminar:     r.U_Preliminar ?? '',
    };
    this.form.reset(values);
    this.initialValues = { ...values };
    this.showForm = true;
  }

  closeForm() {
    this.showForm           = false;
    this.editingRend        = null;
    this.initialValues      = null;
    this.cuentaEsAsociada   = 'Y';
    this.editingPerfilNombre = '';
    this.form.get('idPerfil')?.enable();
    this.form.get('cuenta')?.enable();
    this.form.get('nombreCuenta')?.enable();
    this.form.get('empleado')?.enable();
    this.form.get('nombreEmpleado')?.enable();
    this.filtroEmpleado    = this.perfilActivo?.U_EMP_TEXTO ?? '';
    this.filtroEmpleadoCar = this.perfilActivo?.U_EMP_CAR   ?? 'EMPIEZA';
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreateRendMPayload = {
      idPerfil:       Number(raw.idPerfil),
      cuenta:         raw.cuenta,
      nombreCuenta:   raw.nombreCuenta,
      empleado:       raw.empleado,
      nombreEmpleado: raw.nombreEmpleado,
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
          this.toast.success('Rendición actualizada');
          this.closeForm();
          this.load();
        },
        error: () => { this.isSaving = false; },
      });
    } else {
      this.rendMService.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Rendición creada');
          this.closeForm();
          this.load();
        },
        error: () => { this.isSaving = false; },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(r: RendM) {
    this.openDialog({
      title:        '¿Eliminar rendición?',
      message:      `Se eliminará la rendición N° ${r.U_IdRendicion} — "${r.U_Objetivo}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.rendMService.remove(r.U_IdRendicion).subscribe({
        next:  () => { this.toast.success('Rendición eliminada'); this.load(); },
        error: () => {},
      });
    });
  }

  // ── Dialog ───────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  // ── Helpers ──────────────────────────────────────────────

  estadoTexto(estado: number): string { return this.estadoLabel[estado] ?? `Estado ${estado}`; }
  estadoCss(estado: number): string   { return this.estadoClass[estado] ?? 'badge-secondary'; }

  canEdit(r: RendM): boolean {
    if (this.isAdmin) return true;
    return r.U_IdUsuario === String(this.auth.user?.sub) && r.U_Estado === 1;
  }
  canDelete(r: RendM): boolean { return this.canEdit(r); }

  formatDate(ts: string): string {
    if (!ts) return '';
    return ts.substring(0, 10);
  }
}