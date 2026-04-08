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

import { NormasService } from '../../services/normas.service';
import { DimensionesService } from '../../services/dimensiones.service';
import { ToastService } from '../../core/toast/toast.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { SearchInputComponent } from '../../shared/debounce';
import { NormaConDimension } from '../../models/norma.model';
import { Dimension } from '../../models/dimension.model';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-normas',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
    SearchInputComponent,
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
  loading = false;
  loadError = false;
  filterActiva: 'todas' | 'activas' | 'inactivas' = 'todas';

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
    if (!this.editingNorma) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
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
    this.loading = true;
    this.loadError = false;
    this.normasService.getNormas().subscribe({
      next: (data) => {
        this.normas = data;
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
