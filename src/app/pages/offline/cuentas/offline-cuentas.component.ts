import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OfflineCuentasService, CuentaCOA } from './offline-cuentas.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';

@Component({
  standalone: true,
  selector: 'app-offline-cuentas',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            ConfirmDialogComponent, PaginatorComponent, ActionMenuComponent,
            FormModalComponent, StatusBadgeComponent, FormFieldComponent],
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
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;



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
          this.toast.exito('Cuenta actualizada');
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
          this.toast.exito('Cuenta creada');
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
        next: () => { this.toast.exito('Cuenta eliminada'); this.load(); },
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

  // ── Action Menu ──────────────────────────────────────────────

  getActionMenuItems(c: CuentaCOA): ActionMenuItem[] {
    const isActiva = c.COA_ACTIVA === 'Y';
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
        cssClass: '',
      },
      {
        id: 'toggle',
        label: isActiva ? 'Desactivar' : 'Activar',
        icon: isActiva
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
        cssClass: '',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        cssClass: 'danger',
        divider: true,
      },
    ];
  }

  onActionClick(actionId: string, c: CuentaCOA) {
    switch (actionId) {
      case 'edit':
        this.openEdit(c);
        break;
      case 'toggle':
        this.toggleActiva(c);
        break;
      case 'delete':
        this.confirmDelete(c);
        break;
    }
  }

  private toggleActiva(c: CuentaCOA) {
    const newValue = c.COA_ACTIVA === 'Y' ? 'N' : 'Y';
    this.svc.update(c.COA_CODE, {
      COA_NAME: c.COA_NAME,
      COA_FORMAT_CODE: c.COA_FORMAT_CODE,
      COA_ASOCIADA: c.COA_ASOCIADA,
      COA_ACTIVA: newValue,
    }).subscribe({
      next: () => {
        this.toast.exito(newValue === 'Y' ? 'Cuenta activada' : 'Cuenta desactivada');
        this.load();
      },
      error: err => this.toast.error(err?.error?.message || 'Error al cambiar estado'),
    });
  }
}