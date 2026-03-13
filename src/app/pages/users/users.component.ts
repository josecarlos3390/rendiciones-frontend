import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { UsersService } from './users.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../auth/auth.service';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { User } from '../../models/user.model';
import { SapService, DimensionWithRules } from '../../services/sap.service';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';

@Component({
  standalone: true,
  selector: 'app-users',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent, AppSelectComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  users:    User[] = [];
  filtered: User[] = [];
  paged:    User[] = [];
  search   = '';
  loading   = false;
  loadError = false;

  // Dimensiones SAP (NR1..NR5)
  dimensions:     DimensionWithRules[] = [];
  dimOptionsMap:  Partial<Record<number, SelectOption[]>> = {};  // cacheado, evitar nuevo array en cada ciclo
  loadingDims     = false;

  readonly userTypeOptions: SelectOption[] = [
    { value: 0, label: 'Normal',        icon: '👤' },
    { value: 1, label: 'Administrador', icon: '👑' },
  ];

  readonly estadoOptions: SelectOption[] = [
    { value: '1', label: 'Activo',    icon: '✅' },
    { value: '0', label: 'Inactivo',  icon: '⛔' },
    { value: '2', label: 'Bloqueado', icon: '🔒' },
  ];

  private rebuildDimOptions(): void {
    this.dimOptionsMap = {};
    for (const dim of this.dimensions) {
      this.dimOptionsMap[dim.dimensionCode] = [
        { value: '', label: '— Sin asignar —' },
        ...dim.rules.map(r => ({
          value: r.factorCode,
          label: r.factorDescription,
          hint:  r.factorCode,
        })),
      ];
    }
  }

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  showForm     = false;
  editingUser: User | null = null;
  isSaving     = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    private usersService: UsersService,
    private toast:        ToastService,
    private fb:           FormBuilder,
    private auth:         AuthService,
    private cdr:          ChangeDetectorRef,
    private sapService:   SapService,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
    this.loadDimensions();
  }

  // ── Dimensiones SAP ───────────────────────────────────────
  loadDimensions() {
    this.loadingDims = true;
    this.sapService.getDimensions().subscribe({
      next: (dims) => {
        this.dimensions  = dims;
        this.loadingDims = false;
        this.rebuildDimOptions();
        this.cdr.markForCheck();
      },
      error: () => {
        // Si SAP no está disponible, los campos NR quedan como texto libre
        this.loadingDims = false;
      },
    });
  }

  /** Obtiene la dimensión para un campo NR dado (1-based) */
  getDimension(nrIndex: number): DimensionWithRules | null {
    return this.dimensions.find(d => d.dimensionCode === nrIndex) ?? null;
  }

  /** Lista de normas de reparto para el campo NR dado (1-based) */
  getRules(nrIndex: number) {
    return this.getDimension(nrIndex)?.rules ?? [];
  }

  // ── Helpers ──────────────────────────────────────────────
  get isDirty(): boolean {
    if (!this.editingUser) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    const fields = ['name','supervisorName','superUser','appRend','appConf',
                    'appExtB','appUpLA','genDocPre','fijarNr','nr1','nr2',
                    'nr3','nr4','nr5','fijarSaldo','estado','fechaExpiracion','password'];
    return fields.some(f => curr[f] !== this.initialValues[f]);
  }

  fieldChanged(field: string): boolean {
    if (!this.editingUser || !this.initialValues) return false;
    return this.form.get(field)?.value !== this.initialValues[field];
  }

  initial(u: User): string {
    return (u.U_NomUser ?? u.U_Login ?? 'U')[0].toUpperCase();
  }

  isActive(u: User): boolean   { return u.U_Estado === '1'; }
  isBlocked(u: User): boolean  { return u.U_Estado === '2'; }

  estadoLabel(u: User): string {
    if (u.U_Estado === '1') return 'Activo';
    if (u.U_Estado === '2') return 'Bloqueado';
    return 'Inactivo';
  }

  isExpired(u: User): boolean {
    if (!u.U_FECHAEXPIRACION) return false;
    return new Date(u.U_FECHAEXPIRACION) < new Date();
  }

  // ── Form ─────────────────────────────────────────────────
  private buildForm() {
    this.form = this.fb.group({
      login:          ['', [Validators.required, Validators.maxLength(10)]],
      name:           ['', Validators.required],
      supervisorName: [''],
      password:       [''],
      superUser:      [0],
      appRend:        ['1'],
      appConf:        ['0'],
      appExtB:        ['0'],
      appUpLA:        ['0'],
      genDocPre:      ['0'],
      fijarNr:        ['0'],
      nr1:            [''],
      nr2:            [''],
      nr3:            [''],
      nr4:            [''],
      nr5:            [''],
      fijarSaldo:     ['0'],
      estado:         ['1'],
      fechaExpiracion:[''],
    });
  }

  private defaultExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  }

  // ── CRUD ─────────────────────────────────────────────────
  load() {
    this.loading   = true;
    this.loadError = false;
    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users   = users;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading   = false;
        this.loadError = true;
      },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.users.filter(u =>
      (u.U_NomUser ?? '').toLowerCase().includes(q) ||
      (u.U_Login   ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
    this.cdr.markForCheck();
  }


  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number) {
    this.page = p;
    this.updatePaging();
  }

  onLimitChange(l: number) {
    this.limit = l;
    this.page  = 1;
    this.updatePaging();
  }

  // ── Formulario ───────────────────────────────────────────
  openNew() {
    this.editingUser   = null;
    this.initialValues = null;
    this.form.get('login')?.enable();
    this.form.reset({
      login: '', name: '', supervisorName: '', password: '',
      superUser: 0, appRend: '1', appConf: '0',
      appExtB: '0', appUpLA: '0', genDocPre: '0',
      fijarNr: '0', nr1: '', nr2: '', nr3: '', nr4: '', nr5: '',
      fijarSaldo: '0', estado: '1',
      fechaExpiracion: this.defaultExpiry(),
    });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.showForm = true;
  }

  openEdit(user: User) {
    this.editingUser = user;
    this.form.get('login')?.enable();
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();

    this.form.reset({
      login:          user.U_Login           ?? '',
      name:           user.U_NomUser         ?? '',
      supervisorName: user.U_NomSup          ?? '',
      password:       '',
      superUser:      user.U_SuperUser       ?? 0,
      appRend:        user.U_AppRend   == '1' ? '1' : '0',
      appConf:        user.U_AppConf   == '1' ? '1' : '0',
      appExtB:        user.U_AppExtB   == '1' ? '1' : '0',
      appUpLA:        user.U_AppUpLA   == '1' ? '1' : '0',
      genDocPre:      user.U_GenDocPre == '1' ? '1' : '0',
      fijarNr:        user.U_FIJARNR   == '1' ? '1' : '0',
      nr1:            user.U_NR1             ?? '',
      nr2:            user.U_NR2             ?? '',
      nr3:            user.U_NR3             ?? '',
      nr4:            user.U_NR4             ?? '',
      nr5:            user.U_NR5             ?? '',
      fijarSaldo:     user.U_FIJARSALDO == '1' ? '1' : '0',
      estado:         user.U_Estado ?? '1',
      fechaExpiracion: user.U_FECHAEXPIRACION
        ? String(user.U_FECHAEXPIRACION).substring(0, 10) : '',
    });

    this.form.get('login')?.disable();
    this.initialValues = this.form.getRawValue();
    this.initialValues['password'] = '';
    this.showForm = true;
  }

  closeForm() {
    this.showForm      = false;
    this.editingUser   = null;
    this.initialValues = null;
    this.form.get('login')?.enable();
    this.form.reset();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: any = {
      name:            raw.name,
      supervisorName:  raw.supervisorName,
      superUser:       Number(raw.superUser),
      appRend:         raw.appRend,
      appConf:         raw.appConf,
      appExtB:         raw.appExtB,
      appUpLA:         raw.appUpLA,
      genDocPre:       raw.genDocPre,
      fijarNr:         raw.fijarNr,
      nr1:             raw.nr1 ?? '',
      nr2:             raw.nr2 ?? '',
      nr3:             raw.nr3 ?? '',
      nr4:             raw.nr4 ?? '',
      nr5:             raw.nr5 ?? '',
      fijarSaldo:      raw.fijarSaldo,
      estado:          String(raw.estado),
      fechaExpiracion: raw.fechaExpiracion || undefined,
    };
    if (raw.password?.trim()) payload.password = raw.password;

    if (this.editingUser) {
      this.usersService.updateByAdmin(this.editingUser.U_IdU, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Usuario actualizado');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          // 409/422: errores de negocio con mensaje específico del backend
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al actualizar usuario');
          }
        },
      });
    } else {
      this.usersService.create({ login: raw.login, password: raw.password, ...payload }).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Usuario creado');
          this.closeForm();
          this.load();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al crear usuario');
          }
        },
      });
    }
  }

  // ── Toggle helpers ────────────────────────────────────────
  onLoginInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    input.value = upper;
    this.form.get('login')?.setValue(upper, { emitEvent: false });
  }

  onEstadoToggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.get('estado')?.setValue(checked ? '1' : '0');
  }

  onCheckToggle(field: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.form.get(field)?.setValue(checked ? '1' : '0');
  }

  // ── Dialog ───────────────────────────────────────────────
  confirmToggleStatus(u: User) {
    const isActive = this.isActive(u);
    this.openDialog({
      title:        isActive ? '¿Inactivar usuario?' : '¿Activar usuario?',
      message:      isActive
        ? `"${u.U_NomUser}" no podrá iniciar sesión.`
        : `"${u.U_NomUser}" podrá iniciar sesión nuevamente.`,
      confirmLabel: isActive ? 'Sí, inactivar' : 'Sí, activar',
      type:         isActive ? 'warning' : 'primary',
    }, () => {
      this.usersService.toggleStatus(u.U_IdU, isActive ? '0' : '1', u).subscribe({
        next:  () => { this.toast.success(isActive ? 'Usuario inactivado' : 'Usuario activado'); this.load(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al cambiar estado');
          }
        },
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
}