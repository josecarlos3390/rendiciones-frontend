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

import { DimensionesService } from '../../services/dimensiones.service';
import { ToastService } from '../../core/toast/toast.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/debounce';
import { Dimension } from '../../models/dimension.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-dimensiones',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
    SearchInputComponent,
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
    if (!this.editingDimension) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
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

  onFilterActivaChange() {
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
