import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { PerfilesService } from './perfiles.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { AppConfigService } from '@services/app-config.service';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import {
  Perfil, CreatePerfilPayload,
  PRO_CAR_OPTIONS, CUE_CAR_OPTIONS, EMP_CAR_OPTIONS,
} from '@models/perfil.model';

import { PerfilesTableComponent, PerfilesFilterComponent, PerfilesEmptyComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-perfiles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, AppSelectComponent, FormModalComponent, FormFieldComponent, PerfilesTableComponent, PerfilesFilterComponent, PerfilesEmptyComponent],
  templateUrl: './perfiles.component.html',
  styleUrls: ['./perfiles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilesComponent implements OnInit {
  perfiles:  Perfil[] = [];
  filtered:  Perfil[] = [];
  paged:     Perfil[] = [];
  search    = '';
  loading   = false;
  loadError = false;

  // Paginación
  page       = 1;
  limit      = 5;
  totalPages = 1;

  showForm      = false;
  editingPerfil: Perfil | null = null;
  isSaving      = false;
  form!: FormGroup;

  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  // Opciones para selects
  // Opciones por defecto — se actualizan con appConfig pero nunca quedan vacías
  monedaOptions: SelectOption[] = [
    { value: '0', label: 'Moneda Local (BS)' },
    { value: '1', label: 'Moneda Sistema (USD)' },
  ];
  readonly proCarOptions = PRO_CAR_OPTIONS;
  readonly cueCarOptions = CUE_CAR_OPTIONS;
  readonly empCarOptions = EMP_CAR_OPTIONS;

  /** Recarga monedaOptions desde el servidor y actualiza la vista */
  private async reloadMonedaOptions(): Promise<void> {
    await this.appConfig.load();
    this.monedaOptions = this.appConfig.monedaOptions as SelectOption[];
    this.cdr.markForCheck();
  }

  readonly siNoOptions: SelectOption[] = [
    { value: 0, label: 'NO', icon: '✗' },
    { value: 1, label: 'SÍ', icon: '✓' },
  ];

  readonly lineasOptions: SelectOption[] = [
    { value: 3, label: '3 líneas' },
    { value: 5, label: '5 líneas' },
    { value: 10, label: '10 líneas' },
    { value: 15, label: '15 líneas' },
    { value: 20, label: '20 líneas' },
    { value: 25, label: '25 líneas' },
    { value: 30, label: '30 líneas' },
    { value: 50, label: '50 líneas' },
  ];

  constructor(
    public  auth: AuthService,
    private perfilesService: PerfilesService,
    private toast:           ToastService,
    private fb:              FormBuilder,
    private cdr:             ChangeDetectorRef,
    private appConfig:       AppConfigService,
    private dirtyService:    FormDirtyService,
  ) {}

  ngOnInit() {
    this.buildForm();
    // Con OnPush, el botón no se habilita automáticamente al escribir.
    // statusChanges fuerza la re-evaluación cuando cambia form.valid.
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    Promise.resolve().then(() => {
      this.load();
      this.reloadMonedaOptions();
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  monedaLabel(val: string): string {
    return this.monedaOptions.find(o => o.value === val)?.label ?? val;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      nombrePerfil:   ['', [Validators.required, Validators.maxLength(300)]],
      trabaja:        ['0'],
      perCtaBl:       [0],
      cntLineas:      [10],
      controlPartida: [0],
      proCar:         ['TODOS'],
      proTexto:       ['', Validators.maxLength(25)],
      cueCar:         ['TODOS'],
      cueTexto:       ['', Validators.maxLength(30)],
      empCar:         ['EMPIEZA'],
      empTexto:       ['', Validators.maxLength(10)],
      bolivianos:     [0],
      sucursal:       [0],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.loading   = true;
    this.loadError = false;
    this.perfilesService.getAll().subscribe({
      next: (data) => {
        this.perfiles = data;
        this.loading  = false;
        this.applyFilter();
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

  onSearchChange(value: string) {
    this.search = value;
    this.applyFilter();
  }

  onSearchCleared() {
    this.search = '';
    this.applyFilter();
  }

  applyFilter() {
    const q = this.search.toLowerCase();
    this.filtered = this.perfiles.filter(p =>
      (p.U_NombrePerfil ?? '').toLowerCase().includes(q),
    );
    this.page = 1;
    this.updatePaging();
    this.cdr.markForCheck();
  }


  updatePaging() {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
  }

  onPageChange(p: number)  { this.page = p;  this.updatePaging(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.updatePaging(); }

  // ── Formulario ───────────────────────────────────────────

  openNew() {
    this.reloadMonedaOptions();
    this.editingPerfil = null;
    this.initialValues = null; // isDirty retorna true cuando editingPerfil es null
    this.form.reset({
      nombrePerfil: '', trabaja: '0', perCtaBl: 0,
      cntLineas: 10, controlPartida: 0,
      proCar: 'TODOS', proTexto: '',
      cueCar: 'TODOS', cueTexto: '',
      empCar: 'EMPIEZA', empTexto: '',
      bolivianos: 0, sucursal: 0,
    });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  // ── Menú de Acciones ───────────────────────────────────────────
  getActionMenuItems(p: Perfil): any[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        cssClass: 'text-danger',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
      },
    ];
  }

  onActionClick(actionId: string, p: Perfil): void {
    switch (actionId) {
      case 'edit':
        this.openEdit(p);
        break;
      case 'delete':
        this.confirmDelete(p);
        break;
    }
  }

  openEdit(p: Perfil) {
    this.reloadMonedaOptions();
    this.editingPerfil = p;
    this.form.reset({
      nombrePerfil:   p.U_NombrePerfil   ?? '',
      trabaja:        p.U_Trabaja         ?? '0',
      perCtaBl:       p.U_Per_CtaBl      ?? 0,
      cntLineas:      p.U_CntLineas      ?? 10,
      controlPartida: p.U_ControlPartida ?? 0,
      proCar:         p.U_PRO_CAR        ?? 'TODOS',
      proTexto:       p.U_PRO_Texto      ?? '',
      cueCar:         p.U_CUE_CAR        ?? 'TODOS',
      cueTexto:       p.U_CUE_Texto      ?? '',
      empCar:         p.U_EMP_CAR        ?? 'EMPIEZA',
      empTexto:       p.U_EMP_TEXTO      ?? '',
      bolivianos:     p.U_Bolivianos     ?? 0,
      sucursal:       p.U_SUCURSAL       ?? 0,
    });
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm      = false;
    this.editingPerfil = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    const payload: CreatePerfilPayload = {
      nombrePerfil:   raw.nombrePerfil,
      trabaja:        raw.trabaja,
      perCtaBl:       Number(raw.perCtaBl),
      cntLineas:      Number(raw.cntLineas),
      controlPartida: Number(raw.controlPartida),
      proCar:         raw.proCar,
      proTexto:       raw.proTexto ?? '',
      cueCar:         raw.cueCar,
      cueTexto:       raw.cueTexto ?? '',
      empCar:         raw.empCar,
      empTexto:       raw.empTexto ?? '',
      bolivianos:     Number(raw.bolivianos),
      sucursal:       Number(raw.sucursal),
    };

    if (this.editingPerfil) {
      this.perfilesService.update(this.editingPerfil.U_CodPerfil, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Perfil actualizado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al actualizar perfil');
          }
          this.cdr.markForCheck();
        },
      });
    } else {
      this.perfilesService.create(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.load(() => {
            this.toast.exito('Perfil creado');
            this.closeForm();
          });
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.isSaving = false;
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al crear perfil');
          }
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(p: Perfil) {
    this.openDialog({
      title:        '¿Eliminar perfil?',
      message:      `Se eliminará el perfil "${p.U_NombrePerfil}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.perfilesService.remove(p.U_CodPerfil).subscribe({
        next:  () => { this.toast.exito('Perfil eliminado'); this.load(); this.cdr.markForCheck(); },
        error: (err: any) => {
          if (err?.status === 409 || err?.status === 422) {
            this.toast.error(err?.error?.message || 'Error al eliminar perfil');
          }
          this.cdr.markForCheck();
        },
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
}