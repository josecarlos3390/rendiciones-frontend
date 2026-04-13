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

import { ProyectosService } from '@services/proyectos.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { ActionMenuItem } from '@shared/action-menu';
import { Proyecto } from '@models/proyecto.model';
import { AuthService } from '../../auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

import { ProyectosFiltersComponent, ProyectosTableComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-proyectos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    FormModalComponent,
    FormFieldComponent,
    ProyectosFiltersComponent,
    ProyectosTableComponent,
  ],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosComponent implements OnInit {
  proyectos: Proyecto[] = [];
  filtered: Proyecto[] = [];
  paged: Proyecto[] = [];
  search = '';
  loading = false;
  loadError = false;
  filterActivo: 'todos' | 'activos' | 'inactivos' = 'todos';

  estadoOptions: SelectOption<'todos' | 'activos' | 'inactivos'>[] = [
    { value: 'todos', label: 'Todos', icon: '🔍' },
    { value: 'activos', label: 'Activos', icon: '✅' },
    { value: 'inactivos', label: 'Inactivos', icon: '⭕' },
  ];

  // Paginación
  page = 1;
  limit = 10;
  totalPages = 1;

  showForm = false;
  editingProyecto: Proyecto | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public auth: AuthService,
    private proyectosService: ProyectosService,
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

  // ── Action Menu ──────────────────────────────────────────

  getActionMenuItems(p: Proyecto): ActionMenuItem[] {
    const powerOnIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>';
    const powerOffIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5.64 17.36a9 9 0 1 1 12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>';
    
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'toggle',
        label: p.activo ? 'Desactivar' : 'Activar',
        icon: p.activo ? powerOnIcon : powerOffIcon,
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        cssClass: 'text-danger',
      },
    ];
  }

  onActionClick(actionId: string, p: Proyecto): void {
    switch (actionId) {
      case 'edit':
        this.openEdit(p);
        break;
      case 'toggle':
        this.toggleActivo(p);
        break;
      case 'delete':
        this.confirmDelete(p);
        break;
    }
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
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      activo: [true],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.loading = true;
    this.loadError = false;
    this.proyectosService.getProyectos().subscribe({
      next: (data) => {
        this.proyectos = data;
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
    let result = this.proyectos;

    // Filtro de búsqueda por texto
    const q = this.search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q),
      );
    }

    // Filtro por estado activo
    if (this.filterActivo === 'activos') {
      result = result.filter((p) => p.activo);
    } else if (this.filterActivo === 'inactivos') {
      result = result.filter((p) => !p.activo);
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

  onFilterActivoChange(value: string) {
    this.filterActivo = value as 'todos' | 'activos' | 'inactivos';
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
    this.editingProyecto = null;
    this.initialValues = null;
    this.form.reset({
      code: '',
      name: '',
      activo: true,
    });
    // Habilitar el campo code para nuevos registros
    this.form.get('code')?.enable();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(p: Proyecto) {
    this.editingProyecto = p;
    this.form.reset({
      code: p.code,
      name: p.name,
      activo: p.activo,
    });
    // Deshabilitar el campo code en edición (es la PK)
    this.form.get('code')?.disable();
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm = false;
    this.editingProyecto = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    if (this.editingProyecto) {
      // Actualizar
      this.proyectosService
        .actualizarProyecto(this.editingProyecto.code, {
          name: raw.name,
          activo: raw.activo,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Proyecto actualizado');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg =
              err?.error?.message || 'Error al actualizar proyecto';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    } else {
      // Crear
      this.proyectosService
        .crearProyecto({
          code: raw.code.trim().toUpperCase(),
          name: raw.name.trim(),
          activo: raw.activo,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Proyecto creado');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al crear proyecto';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ── Acciones rápidas ─────────────────────────────────────

  toggleActivo(p: Proyecto) {
    this.proyectosService.toggleActivo(p.code).subscribe({
      next: () => {
        const estado = !p.activo ? 'activado' : 'desactivado';
        this.toast.exito(`Proyecto ${estado}`);
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

  confirmDelete(p: Proyecto) {
    this.openDialog(
      {
        title: '¿Eliminar proyecto?',
        message: `Se eliminará el proyecto "${p.code} - ${p.name}" de forma permanente.`,
        confirmLabel: 'Sí, eliminar',
        type: 'danger',
      },
      () => {
        this.proyectosService.eliminarProyecto(p.code).subscribe({
          next: () => {
            this.toast.exito('Proyecto eliminado');
            this.load();
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al eliminar proyecto';
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
