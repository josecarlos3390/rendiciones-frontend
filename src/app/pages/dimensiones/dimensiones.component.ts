import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import { DimensionesService } from '@services/dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { Dimension } from '@models/dimension.model';
import { AuthService } from '../../auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { ActionMenuItem } from '@shared/action-menu';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

import { DimensionesFiltersComponent, DimensionesTableComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-dimensiones',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    FormModalComponent,
    FormFieldComponent,
    DimensionesFiltersComponent,
    DimensionesTableComponent,
  ],
  templateUrl: './dimensiones.component.html',
  styleUrls: ['./dimensiones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DimensionesComponent implements OnInit {
  dimensiones: Dimension[] = [];
  filtered: Dimension[] = [];
  paged: Dimension[] = [];
  search = '';
  loading = false;
  loadError = false;
  filterActiva: 'todas' | 'activas' | 'inactivas' = 'todas';

  estadoOptions: SelectOption<'todas' | 'activas' | 'inactivas'>[] = [
    { value: 'todas', label: 'Todas', icon: '🔍' },
    { value: 'activas', label: 'Activas', icon: '✅' },
    { value: 'inactivas', label: 'Inactivas', icon: '⭕' },
  ];

  // Paginación
  page = 1;
  limit = 10;
  totalPages = 1;

  showForm = false;
  editingDimension: Dimension | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public auth: AuthService,
    private dimensionesService: DimensionesService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private dirtyService: FormDirtyService,
  ) {}

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    Promise.resolve().then(() => {
      this.load();
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  get isAdmin(): boolean {
    return this.auth.role === 'ADMIN';
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      code: [null, [Validators.required, Validators.min(1), Validators.max(99)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', Validators.maxLength(250)],
      activa: [true],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.loading = true;
    this.loadError = false;
    this.dimensionesService.getDimensiones().subscribe({
      next: (data) => {
        this.dimensiones = data;
        this.loading = false;
        this.applyFilter();
        this.cdr.markForCheck();
        onComplete?.();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  applyFilter() {
    let result = this.dimensiones;

    // Filtro de búsqueda por texto
    const q = this.search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.descripcion.toLowerCase().includes(q),
      );
    }

    // Filtro por estado activa
    if (this.filterActiva === 'activas') {
      result = result.filter((d) => d.activa);
    } else if (this.filterActiva === 'inactivas') {
      result = result.filter((d) => !d.activa);
    }

    this.filtered = result;
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
    this.page = 1;
    this.updatePaging();
  }

  onFilterActivaChange(value: string) {
    this.filterActiva = value as 'todas' | 'activas' | 'inactivas';
    this.applyFilter();
  }

  onSearchChange(value: string) {
    this.search = value;
    this.applyFilter();
  }

  onSearchCleared() {
    this.search = '';
    this.applyFilter();
  }

  // ── Formulario ───────────────────────────────────────────

  openNew() {
    this.editingDimension = null;
    this.initialValues = null;
    this.form.reset({
      code: null,
      name: '',
      descripcion: '',
      activa: true,
    });
    this.form.get('code')?.enable();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(d: Dimension) {
    this.editingDimension = d;
    this.form.reset({
      code: d.code,
      name: d.name,
      descripcion: d.descripcion,
      activa: d.activa,
    });
    this.form.get('code')?.disable();
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm = false;
    this.editingDimension = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    if (this.editingDimension) {
      this.dimensionesService
        .actualizarDimension(this.editingDimension.code, {
          name: raw.name,
          descripcion: raw.descripcion,
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Dimensión actualizada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al actualizar dimensión';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    } else {
      this.dimensionesService
        .crearDimension({
          code: Number(raw.code),
          name: raw.name.trim(),
          descripcion: raw.descripcion?.trim() || '',
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Dimensión creada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al crear dimensión';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ── Acciones rápidas ─────────────────────────────────────

  toggleActiva(d: Dimension) {
    this.dimensionesService.toggleActivo(d.code).subscribe({
      next: () => {
        const estado = !d.activa ? 'activada' : 'desactivada';
        this.toast.exito(`Dimensión ${estado}`);
        this.load();
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Error al cambiar estado';
        this.toast.error(msg);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(d: Dimension) {
    this.openDialog(
      {
        title: '¿Eliminar dimensión?',
        message: `Se eliminará la dimensión "${d.code} - ${d.name}" de forma permanente.`,
        confirmLabel: 'Sí, eliminar',
        type: 'danger',
      },
      () => {
        this.dimensionesService.eliminarDimension(d.code).subscribe({
          next: () => {
            this.toast.exito('Dimensión eliminada');
            this.load();
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al eliminar dimensión';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
      },
    );
  }

  // ── Action Menu ──────────────────────────────────────────

  getActionMenuItems(d: Dimension): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'toggle',
        label: d.activa ? 'Desactivar' : 'Activar',
        icon: d.activa
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
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

  onActionClick(d: Dimension, action: string) {
    switch (action) {
      case 'edit':
        this.openEdit(d);
        break;
      case 'toggle':
        this.toggleActiva(d);
        break;
      case 'delete':
        this.confirmDelete(d);
        break;
    }
  }

  // ── Dialog ───────────────────────────────────────────────

  openDialog(config: ConfirmDialogConfig, onConfirm: () => void) {
    this.dialogConfig = config;
    this._pendingAction = onConfirm;
    this.showDialog = true;
  }
  onDialogConfirm() {
    this.showDialog = false;
    this._pendingAction?.();
    this._pendingAction = null;
  }
  onDialogCancel() {
    this.showDialog = false;
    this._pendingAction = null;
  }
}
