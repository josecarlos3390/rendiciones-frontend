import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OfflineNormasService, Norma } from './offline-normas.service';
import { OfflineDimensionesService, Dimension } from '../dimensiones/offline-dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

@Component({
  standalone: true,
  selector: 'app-offline-normas',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            ConfirmDialogComponent, PaginatorComponent, AppSelectComponent, ActionMenuComponent,
            FormModalComponent, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './offline-normas.component.html',
  styleUrls:   ['./offline-normas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineNormasComponent implements OnInit {

  normas:   Norma[]     = [];
  filtered: Norma[]     = [];
  paged:    Norma[]     = [];
  dims:     Dimension[] = [];

  search    = '';
  filtroDim = '';
  loading   = false;
  loadError = false;
  page = 1; limit = 10; totalPages = 1;

  showForm     = false;
  editingItem: Norma | null = null;
  isSaving     = false;
  form!: FormGroup;
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  dimOptions:   SelectOption[] = [];
  readonly activaOptions: SelectOption[] = [
    { value: 'Y', label: 'Activa' },
    { value: 'N', label: 'Inactiva' },
  ];

  constructor(
    private svc:     OfflineNormasService,
    private dimsSvc: OfflineDimensionesService,
    private toast:   ToastService,
    private fb:      FormBuilder,
    private cdr:     ChangeDetectorRef,
    private dirtyService: FormDirtyService,
  ) {}

  ngOnInit() {
    this.buildForm();
    // Cargar dimensiones para el selector
    this.dimsSvc.getAll().subscribe({
      next: d => {
        this.dims = d;
        this.dimOptions = d.map(dim => ({ value: dim.DIM_CODE, label: `${dim.DIM_CODE} — ${dim.DIM_NAME}` }));
        this.cdr.markForCheck();
      },
    });
    this.load();
  }

  load() {
    this.loading = true; this.loadError = false; this.cdr.markForCheck();
    this.svc.getAll().subscribe({
      next: (data: Norma[]) => { this.normas = data; this.loading = false; this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.normas.filter(n => {
      const matchSearch = !q || n.NR_FACTOR_CODE.toLowerCase().includes(q) || n.NR_DESCRIPCION.toLowerCase().includes(q);
      const matchDim    = !this.filtroDim || String(n.NR_DIMENSION) === String(this.filtroDim);
      return matchSearch && matchDim;
    });
    this.page = 1;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    this.updatePaged();
  }

  updatePaged() { const s = (this.page - 1) * this.limit; this.paged = this.filtered.slice(s, s + this.limit); this.cdr.markForCheck(); }
  onPageChange(p: number)  { this.page = p; this.updatePaged(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit)); this.updatePaged(); }

  private buildForm() {
    this.form = this.fb.group({
      NR_FACTOR_CODE: ['', Validators.required],
      NR_DESCRIPCION: ['', Validators.required],
      NR_DIMENSION:   [null, Validators.required],
      NR_ACTIVA:      ['Y'],
    });
  }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  openNew() {
    this.editingItem = null;
    this.form.reset({ NR_FACTOR_CODE: '', NR_DESCRIPCION: '', NR_DIMENSION: null, NR_ACTIVA: 'Y' });
    this.form.get('NR_FACTOR_CODE')?.enable();
    this.initialValues = { ...this.form.value };
    this.showForm = true; this.cdr.markForCheck();
  }

  openEdit(n: Norma) {
    this.editingItem = n;
    this.form.reset({ NR_FACTOR_CODE: n.NR_FACTOR_CODE, NR_DESCRIPCION: n.NR_DESCRIPCION, NR_DIMENSION: n.NR_DIMENSION, NR_ACTIVA: n.NR_ACTIVA });
    this.form.get('NR_FACTOR_CODE')?.disable();
    this.initialValues = { ...this.form.value };
    this.showForm = true; this.cdr.markForCheck();
  }

  closeForm() { this.showForm = false; this.editingItem = null; this.cdr.markForCheck(); }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true; this.cdr.markForCheck();
    const v = this.form.getRawValue();

    const onSuccess = () => {
      this.isSaving = false;
      this.toast.exito(this.editingItem ? 'Norma actualizada' : 'Norma creada');
      this.closeForm(); this.load();
    };
    const onError = (err: any) => {
      this.isSaving = false;
      this.toast.error(err?.error?.message || 'Error al guardar');
      this.cdr.markForCheck();
    };

    if (this.editingItem) {
      this.svc.update(this.editingItem.NR_FACTOR_CODE, {
        NR_DESCRIPCION: v.NR_DESCRIPCION, NR_DIMENSION: v.NR_DIMENSION, NR_ACTIVA: v.NR_ACTIVA,
      }).subscribe({ next: onSuccess, error: onError });
    } else {
      this.svc.create(v).subscribe({ next: onSuccess, error: onError });
    }
  }

  confirmDelete(n: Norma) {
    this.openDialog({
      title: '¿Eliminar norma?',
      message: `Se eliminará la norma "${n.NR_FACTOR_CODE} — ${n.NR_DESCRIPCION}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar', type: 'danger',
    }, () => {
      this.svc.remove(n.NR_FACTOR_CODE).subscribe({
        next: () => { this.toast.exito('Norma eliminada'); this.load(); },
        error: (err: any) => this.toast.error(err?.error?.message || 'Error al eliminar'),
      });
    });
  }

  private openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig = config; this._pendingAction = onConfirm; this.showDialog = true; this.cdr.markForCheck();
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  getActionMenuItems(n: Norma): ActionMenuItem[] {
    const isActive = n.NR_ACTIVA === 'Y';
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      },
      {
        id: 'toggle',
        label: isActive ? 'Desactivar' : 'Activar',
        icon: isActive
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
        cssClass: 'text-danger',
        divider: true,
      },
    ];
  }

  onActionClick(action: string, n: Norma) {
    switch (action) {
      case 'edit':
        this.openEdit(n);
        break;
      case 'toggle':
        this.toggleActiva(n);
        break;
      case 'delete':
        this.confirmDelete(n);
        break;
    }
  }

  private toggleActiva(n: Norma) {
    const newValue = n.NR_ACTIVA === 'Y' ? 'N' : 'Y';
    this.svc.update(n.NR_FACTOR_CODE, { NR_ACTIVA: newValue }).subscribe({
      next: () => {
        this.toast.exito(newValue === 'Y' ? 'Norma activada' : 'Norma desactivada');
        this.load();
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Error al cambiar estado'),
    });
  }
}
