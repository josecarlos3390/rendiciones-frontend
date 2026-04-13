import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { OfflineDimensionesService, Dimension } from './offline-dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '@shared/paginator/paginator.component';
import { SelectOption } from '@shared/app-select/app-select.component';
import { ActionMenuComponent, ActionMenuItem } from '@shared/action-menu/action-menu.component';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

@Component({
  standalone: true,
  selector: 'app-offline-dimensiones',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,
            ConfirmDialogComponent, PaginatorComponent, ActionMenuComponent,
            FormModalComponent, StatusBadgeComponent, FormFieldComponent],
  templateUrl: './offline-dimensiones.component.html',
  styleUrls:   ['./offline-dimensiones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineDimensionesComponent implements OnInit {

  dims:     Dimension[] = [];
  filtered: Dimension[] = [];
  paged:    Dimension[] = [];

  search    = '';
  loading   = false;
  loadError = false;
  page = 1; limit = 10; totalPages = 1;

  showForm     = false;
  editingItem: Dimension | null = null;
  isSaving     = false;
  form!: FormGroup;
  initialValues: any = null;

  showDialog   = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  readonly activaOptions: SelectOption[] = [
    { value: 'Y', label: 'Activa' },
    { value: 'N', label: 'Inactiva' },
  ];

  private dirtyService = inject(FormDirtyService);

  constructor(
    private svc:   OfflineDimensionesService,
    private toast: ToastService,
    private fb:    FormBuilder,
    private cdr:   ChangeDetectorRef,
  ) {}

  ngOnInit() { this.buildForm(); this.load(); }

  load() {
    this.loading = true; this.loadError = false; this.cdr.markForCheck();
    this.svc.getAll().subscribe({
      next: d => { this.dims = d; this.loading = false; this.applyFilter(); this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.loadError = true; this.cdr.markForCheck(); },
    });
  }

  applyFilter() {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.dims.filter(d =>
      !q || d.DIM_NAME.toLowerCase().includes(q) || String(d.DIM_CODE).includes(q),
    );
    this.page = 1;
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit));
    this.updatePaged();
  }

  updatePaged() { const s = (this.page - 1) * this.limit; this.paged = this.filtered.slice(s, s + this.limit); this.cdr.markForCheck(); }
  onPageChange(p: number)  { this.page = p; this.updatePaged(); }
  onLimitChange(l: number) { this.limit = l; this.page = 1; this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.limit)); this.updatePaged(); }

  private buildForm() {
    this.form = this.fb.group({
      DIM_CODE:        [null, Validators.required],
      DIM_NAME:        ['',  Validators.required],
      DIM_DESCRIPCION: [''],
      DIM_ACTIVA:      ['Y'],
    });
  }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  openNew() {
    this.editingItem = null;
    this.form.reset({ DIM_CODE: null, DIM_NAME: '', DIM_DESCRIPCION: '', DIM_ACTIVA: 'Y' });
    this.form.get('DIM_CODE')?.enable();
    this.initialValues = { ...this.form.value };
    this.showForm = true; this.cdr.markForCheck();
  }

  openEdit(d: Dimension) {
    this.editingItem = d;
    this.form.reset({ DIM_CODE: d.DIM_CODE, DIM_NAME: d.DIM_NAME, DIM_DESCRIPCION: d.DIM_DESCRIPCION, DIM_ACTIVA: d.DIM_ACTIVA });
    this.form.get('DIM_CODE')?.disable();
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
      this.toast.exito(this.editingItem ? 'Dimensión actualizada' : 'Dimensión creada');
      this.closeForm(); this.load();
    };
    const onError = (err: any) => {
      this.isSaving = false;
      this.toast.error(err?.error?.message || 'Error al guardar');
      this.cdr.markForCheck();
    };

    if (this.editingItem) {
      this.svc.update(this.editingItem.DIM_CODE, {
        DIM_NAME: v.DIM_NAME, DIM_DESCRIPCION: v.DIM_DESCRIPCION, DIM_ACTIVA: v.DIM_ACTIVA,
      }).subscribe({ next: onSuccess, error: onError });
    } else {
      this.svc.create(v).subscribe({ next: onSuccess, error: onError });
    }
  }

  confirmToggle(d: Dimension) {
    const nueva = d.DIM_ACTIVA === 'Y' ? 'N' : 'Y';
    const label = nueva === 'Y' ? 'activar' : 'desactivar';
    this.openDialog({
      title: `¿${nueva === 'Y' ? 'Activar' : 'Desactivar'} dimensión?`,
      message: `Se va a ${label} la dimensión "${d.DIM_CODE} — ${d.DIM_NAME}".`,
      confirmLabel: 'Confirmar', type: 'warning',
    }, () => {
      this.svc.update(d.DIM_CODE, { DIM_ACTIVA: nueva }).subscribe({
        next: () => { this.toast.exito(`Dimensión ${nueva === 'Y' ? 'activada' : 'desactivada'}`); this.load(); },
        error: err => this.toast.error(err?.error?.message || 'Error al cambiar estado'),
      });
    });
  }

  confirmDelete(d: Dimension) {
    this.openDialog({
      title: '¿Eliminar dimensión?',
      message: `Se eliminará la dimensión "${d.DIM_CODE} — ${d.DIM_NAME}" y todas sus normas de reparto.`,
      confirmLabel: 'Sí, eliminar', type: 'danger',
    }, () => {
      this.svc.remove(d.DIM_CODE).subscribe({
        next: () => { this.toast.exito('Dimensión eliminada'); this.load(); },
        error: err => this.toast.error(err?.error?.message || 'Error al eliminar'),
      });
    });
  }

  private openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig = config; this._pendingAction = onConfirm; this.showDialog = true; this.cdr.markForCheck();
  }
  onDialogConfirm() { this.showDialog = false; this._pendingAction?.(); this._pendingAction = null; }
  onDialogCancel()  { this.showDialog = false; this._pendingAction = null; }

  getActionMenuItems(d: Dimension): ActionMenuItem[] {
    const isActive = d.DIM_ACTIVA === 'Y';
    const powerIcon = isActive
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>';

    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'toggle',
        label: isActive ? 'Desactivar' : 'Activar',
        icon: powerIcon,
        cssClass: isActive ? 'text-warning' : 'text-success',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        cssClass: 'text-danger',
        divider: true,
      },
    ];
  }

  onActionClick(actionId: string, d: Dimension): void {
    switch (actionId) {
      case 'edit':
        this.openEdit(d);
        break;
      case 'toggle':
        this.confirmToggle(d);
        break;
      case 'delete':
        this.confirmDelete(d);
        break;
    }
  }
}
