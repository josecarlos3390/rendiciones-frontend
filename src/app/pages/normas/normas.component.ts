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

import { NormasService } from '@services/normas.service';
import { DimensionesService } from '@services/dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { NormaConDimension } from '@models/norma.model';
import { Dimension } from '@models/dimension.model';
import { AuthService } from '../../auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { LoadingStateComponent } from '@shared/loading-state';
import { ActionMenuItem } from '@shared/action-menu';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

import { NormasFiltersComponent, NormasTableComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-normas',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    LoadingStateComponent,
    FormModalComponent,
    FormFieldComponent,
    NormasFiltersComponent,
    NormasTableComponent,
  ],
  templateUrl: './normas.component.html',
  styleUrls: ['./normas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NormasComponent implements OnInit {
  normas: NormaConDimension[] = [];
  filtered: NormaConDimension[] = [];
  paged: NormaConDimension[] = [];
  dimensiones: Dimension[] = [];
  search = '';
  loadingState: 'idle' | 'loading' | 'success' | 'empty' | 'error' = 'idle';
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
  editingNorma: NormaConDimension | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public auth: AuthService,
    private normasService: NormasService,
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
      this.loadDimensiones();
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  get isAdmin(): boolean {
    return this.auth.role === 'ADMIN';
  }

  get dimensionesActivas(): Dimension[] {
    return this.dimensiones.filter(d => d.activa);
  }

  /**
   * Compara dimensiones para el select
   */
  compareDimension(d1: number | null, d2: number | null): boolean {
    return d1 === d2;
  }

  // ── Form ─────────────────────────────────────────────────

  private buildForm() {
    this.form = this.fb.group({
      factorCode: ['', [Validators.required, Validators.maxLength(50)]],
      descripcion: ['', [Validators.required, Validators.maxLength(250)]],
      dimension: [null, [Validators.required, Validators.min(1)]],
      activa: [true],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.loadingState = 'loading';
    this.cdr.markForCheck();
    
    this.normasService.getNormas().subscribe({
      next: (data) => {
        this.normas = data;
        this.applyFilter();
        onComplete?.();
      },
      error: () => {
        this.loadingState = 'error';
        this.cdr.markForCheck();
        onComplete?.();
      },
    });
  }

  loadDimensiones() {
    this.dimensionesService.getDimensiones({ activa: true }).subscribe({
      next: (data) => {
        this.dimensiones = data;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Error al cargar dimensiones');
      },
    });
  }

  applyFilter() {
    let result = this.normas;

    // Filtro de búsqueda por texto
    const q = this.search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (n) =>
          n.factorCode.toLowerCase().includes(q) ||
          n.descripcion.toLowerCase().includes(q) ||
          n.dimensionName.toLowerCase().includes(q),
      );
    }

    // Filtro por estado activa
    if (this.filterActiva === 'activas') {
      result = result.filter((n) => n.activa);
    } else if (this.filterActiva === 'inactivas') {
      result = result.filter((n) => !n.activa);
    }

    this.filtered = result;
    this.page = 1;
    this.updatePaging();
    // Set estado success o empty según haya resultados
    this.loadingState = this.filtered.length > 0 ? 'success' : 'empty';
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
    this.editingNorma = null;
    this.initialValues = null;
    this.form.reset({
      factorCode: '',
      descripcion: '',
      dimension: null,
      activa: true,
    });
    this.form.get('factorCode')?.enable();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(n: NormaConDimension) {
    this.editingNorma = n;
    this.form.reset({
      factorCode: n.factorCode,
      descripcion: n.descripcion,
      dimension: n.dimension,
      activa: n.activa,
    });
    this.form.get('factorCode')?.disable();
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm = false;
    this.editingNorma = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    if (this.editingNorma) {
      this.normasService
        .actualizarNorma(this.editingNorma.factorCode, {
          descripcion: raw.descripcion,
          dimension: Number(raw.dimension),
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Norma actualizada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al actualizar norma';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    } else {
      this.normasService
        .crearNorma({
          factorCode: raw.factorCode.trim().toUpperCase(),
          descripcion: raw.descripcion.trim(),
          dimension: Number(raw.dimension),
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Norma creada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al crear norma';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ── Acciones rápidas ─────────────────────────────────────

  toggleActiva(n: NormaConDimension) {
    this.normasService.toggleActivo(n.factorCode).subscribe({
      next: () => {
        const estado = !n.activa ? 'activada' : 'desactivada';
        this.toast.exito(`Norma ${estado}`);
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

  confirmDelete(n: NormaConDimension) {
    this.openDialog(
      {
        title: '¿Eliminar norma?',
        message: `Se eliminará la norma "${n.factorCode} - ${n.descripcion}" de forma permanente.`,
        confirmLabel: 'Sí, eliminar',
        type: 'danger',
      },
      () => {
        this.normasService.eliminarNorma(n.factorCode).subscribe({
          next: () => {
            this.toast.exito('Norma eliminada');
            this.load();
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al eliminar norma';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
      },
    );
  }

  // ── Action Menu ──────────────────────────────────────────

  getActionMenuItems(n: NormaConDimension): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'toggle',
        label: n.activa ? 'Desactivar' : 'Activar',
        icon: n.activa
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        cssClass: 'text-danger',
      },
    ];
  }

  onActionClick(action: string, n: NormaConDimension): void {
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
