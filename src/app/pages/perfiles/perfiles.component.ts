import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { PerfilesService } from './perfiles.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import {
  Perfil, CreatePerfilPayload,
  PRO_CAR_OPTIONS, CUE_CAR_OPTIONS, EMP_CAR_OPTIONS,
} from '../../models/perfil.model';
import { AppSelectComponent, SelectOption } from '../../shared/app-select/app-select.component';
import { AppConfigService } from '../../services/app-config.service';

@Component({
  standalone: true,
  selector: 'app-perfiles',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmDialogComponent, PaginatorComponent, AppSelectComponent],
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

  private initialValues: any = null;

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

  constructor(
    private perfilesService: PerfilesService,
    private toast:           ToastService,
    private fb:              FormBuilder,
    private cdr:             ChangeDetectorRef,
    private appConfig:       AppConfigService,
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
    if (!this.editingPerfil) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
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
      proCar: 'TODOS', proTexto: '',
      cueCar: 'TODOS', cueTexto: '',
      empCar: 'EMPIEZA', empTexto: '',
      bolivianos: 0, sucursal: 0,
    });
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(p: Perfil) {
    this.reloadMonedaOptions();
    this.editingPerfil = p;
    this.form.reset({
      nombrePerfil:   p.U_NombrePerfil   ?? '',
      trabaja:        p.U_Trabaja         ?? '0',
      perCtaBl:       p.U_Per_CtaBl      ?? 0,
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
            this.toast.success('Perfil actualizado');
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
            this.toast.success('Perfil creado');
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
        next:  () => { this.toast.success('Perfil eliminado'); this.load(); this.cdr.markForCheck(); },
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