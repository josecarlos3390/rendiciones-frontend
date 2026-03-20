import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OfflineCuentasService, CuentaCOA } from './offline-cuentas.service';
import { ToastService } from '../../../core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../../shared/paginator/paginator.component';
import { AppSelectComponent, SelectOption } from '../../../shared/app-select/app-select.component';

@Component({
  standalone: true,
  selector: 'app-offline-cuentas',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            ConfirmDialogComponent, PaginatorComponent, AppSelectComponent],
  templateUrl: './offline-cuentas.component.html',
  styleUrls:   ['./offline-cuentas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineCuentasComponent implements OnInit {

  cuentas:  CuentaCOA[] = [];
  filtered: CuentaCOA[] = [];
  paged:    CuentaCOA[] = [];

  search       = '';
  filtroActiva = '';
  loading      = false;
  loadError    = false;

  // Paginación
  page       = 1;
  limit      = 10;
  totalPages = 1;

  showForm     = false;
  editingItem: CuentaCOA | null = null;
  isSaving     = false;
  form!: FormGroup;
  private initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  readonly siNoOptions: SelectOption[] = [
    { value: 'N', label: 'No' },
    { value: 'Y', label: 'Sí' },
  ];

  readonly activaOptions: SelectOption[] = [
    { value: 'Y', label: 'Activa' },
    { value: 'N', label: 'Inactiva' },
  ];

  constructor(
    private svc:  OfflineCuentasService,
    private toast: ToastService,
    private fb:    FormBuilder,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.load();
  }

  // ── Carga ────────────────────────────────────────────────────

  load() {
    this.loading   = true;
    this.loadError = false;
    this.cdr.markForCheck();

    this.svc.getAll().subscribe({
      next: data => {
        this.cuentas  = data;
        this.loading  = false;
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

  // ── Filtro y paginación ──────────────────────────────────────

  applyFilter() {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.cuentas.filter(c => {
      const matchSearch = !q ||
        c.COA_CODE.toLowerCase().includes(q) ||
        c.COA_NAME.toLowerCase().includes(q);
      const matchActiva = !this.filtroActiva || c.COA_ACTIVA === this.filtroActiva;
      return matchSearch && matchActiva;
    });
    this.page       = 1;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    this.updatePaged();
  }

  updatePaged() {
    const start = (this.page - 1) * this.limit;
    this.paged  = this.filtered.slice(start, start + this.limit);
    this.cdr.markForCheck();
  }

  onPageChange(p: number)  { this.page = p;     this.updatePaged(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit)); this.updatePaged(); }

  // ── Formulario ───────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      COA_CODE:        ['', Validators.required],
      COA_NAME:        ['', Validators.required],
      COA_FORMAT_CODE: [''],
      COA_ASOCIADA:    ['N'],
      COA_ACTIVA:      ['Y'],
    });
  }

  get isDirty(): boolean {
    return JSON.stringify(this.form.value) !== JSON.stringify(this.initialValues);
  }

  openNew() {
    this.editingItem   = null;
    this.form.reset({ COA_CODE: '', COA_NAME: '', COA_FORMAT_CODE: '', COA_ASOCIADA: 'N', COA_ACTIVA: 'Y' });
    this.form.get('COA_CODE')?.enable();
    this.initialValues = { ...this.form.value };
    this.showForm      = true;
    this.cdr.markForCheck();
  }

  openEdit(c: CuentaCOA) {
    this.editingItem = c;
    this.form.reset({
      COA_CODE:        c.COA_CODE,
      COA_NAME:        c.COA_NAME,
      COA_FORMAT_CODE: c.COA_FORMAT_CODE ?? '',
      COA_ASOCIADA:    c.COA_ASOCIADA,
      COA_ACTIVA:      c.COA_ACTIVA,
    });
    this.form.get('COA_CODE')?.disable();
    this.initialValues = { ...this.form.value };
    this.showForm      = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm    = false;
    this.editingItem = null;
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true;
    this.cdr.markForCheck();

    const v = this.form.getRawValue();

    if (this.editingItem) {
      this.svc.update(this.editingItem.COA_CODE, {
        COA_NAME:        v.COA_NAME,
        COA_FORMAT_CODE: v.COA_FORMAT_CODE,
        COA_ASOCIADA:    v.COA_ASOCIADA,
        COA_ACTIVA:      v.COA_ACTIVA,
      }).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Cuenta actualizada');
          this.closeForm();
          this.load();
        },
        error: err => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Error al actualizar');
          this.cdr.markForCheck();
        },
      });
    } else {
      this.svc.create(v).subscribe({
        next: () => {
          this.isSaving = false;
          this.toast.success('Cuenta creada');
          this.closeForm();
          this.load();
        },
        error: err => {
          this.isSaving = false;
          this.toast.error(err?.error?.message || 'Error al crear');
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ── Eliminar ─────────────────────────────────────────────────

  confirmDelete(c: CuentaCOA) {
    this.openDialog({
      title:        '¿Eliminar cuenta?',
      message:      `Se eliminará la cuenta "${c.COA_CODE} — ${c.COA_NAME}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type:         'danger',
    }, () => {
      this.svc.remove(c.COA_CODE).subscribe({
        next: () => { this.toast.success('Cuenta eliminada'); this.load(); },
        error: err => this.toast.error(err?.error?.message || 'Error al eliminar'),
      });
    });
  }

  private openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig   = config;
    this._pendingAction = onConfirm;
    this.showDialog     = true;
    this.cdr.markForCheck();
  }

  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }
}