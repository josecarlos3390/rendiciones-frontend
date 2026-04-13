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

import { CoaService } from '@services/coa.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { CuentaCOA } from '@models/coa.model';
import { AuthService } from '@auth/auth.service';
import { SelectOption } from '@shared/app-select/app-select.component';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field';

import { CoaFiltersComponent, CoaTableComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-coa',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,

    FormModalComponent,
    FormFieldComponent,
    CoaFiltersComponent,
    CoaTableComponent,
  ],
  templateUrl: './coa.component.html',
  styleUrls: ['./coa.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoaComponent implements OnInit {
  cuentas: CuentaCOA[] = [];
  filtered: CuentaCOA[] = [];
  paged: CuentaCOA[] = [];
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
  editingCuenta: CuentaCOA | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: any = null;

  showDialog = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '' };
  private _pendingAction: (() => void) | null = null;

  constructor(
    public auth: AuthService,
    private coaService: CoaService,
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
    if (!this.editingCuenta) return true;
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
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(250)]],
      formatCode: ['', Validators.maxLength(50)],
      asociada: [false],
      activa: [true],
    });
  }

  // ── CRUD ─────────────────────────────────────────────────

  load(onComplete?: () => void) {
    this.loading = true;
    this.loadError = false;
    this.coaService.getCuentas().subscribe({
      next: (data) => {
        this.cuentas = data;
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
    let result = this.cuentas;

    // Filtro de búsqueda por texto
    const q = this.search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q),
      );
    }

    // Filtro por estado activa
    if (this.filterActiva === 'activas') {
      result = result.filter((c) => c.activa);
    } else if (this.filterActiva === 'inactivas') {
      result = result.filter((c) => !c.activa);
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
    this.editingCuenta = null;
    this.initialValues = null;
    this.form.reset({
      code: '',
      name: '',
      formatCode: '',
      asociada: false,
      activa: true,
    });
    this.form.get('code')?.enable();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  openEdit(c: CuentaCOA) {
    this.editingCuenta = c;
    this.form.reset({
      code: c.code,
      name: c.name,
      formatCode: c.formatCode,
      asociada: c.asociada,
      activa: c.activa,
    });
    this.form.get('code')?.disable();
    this.initialValues = this.form.getRawValue();
    this.showForm = true;
    this.cdr.markForCheck();
  }

  closeForm() {
    this.showForm = false;
    this.editingCuenta = null;
    this.initialValues = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save() {
    if (this.form.invalid || this.isSaving) return;
    this.isSaving = true;
    const raw = this.form.getRawValue();

    if (this.editingCuenta) {
      this.coaService
        .actualizarCuenta(this.editingCuenta.code, {
          name: raw.name,
          formatCode: raw.formatCode,
          asociada: raw.asociada,
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Cuenta actualizada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al actualizar cuenta';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    } else {
      this.coaService
        .crearCuenta({
          code: raw.code.trim().toUpperCase(),
          name: raw.name.trim(),
          formatCode: raw.formatCode?.trim() || raw.code.trim().toUpperCase(),
          asociada: raw.asociada,
          activa: raw.activa,
        })
        .subscribe({
          next: () => {
            this.isSaving = false;
            this.load(() => {
              this.toast.exito('Cuenta creada');
              this.closeForm();
            });
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            this.isSaving = false;
            const msg = err?.error?.message || 'Error al crear cuenta';
            this.toast.error(msg);
            this.cdr.markForCheck();
          },
        });
    }
  }

  // ── Action Menu ──────────────────────────────────────────

  getActionMenuItems(c: CuentaCOA): any[] {
    const editIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    const trashIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: editIcon,
      },
      {
        id: 'delete',
        label: 'Eliminar',
        icon: trashIcon,
        cssClass: 'action-danger',
      },
    ];
  }

  onActionClick(actionId: string, c: CuentaCOA): void {
    switch (actionId) {
      case 'edit':
        this.openEdit(c);
        break;
      case 'delete':
        this.confirmDelete(c);
        break;
    }
  }

  // ── Acciones rápidas ─────────────────────────────────────

  toggleActiva(c: CuentaCOA) {
    this.coaService.toggleActivo(c.code).subscribe({
      next: () => {
        const estado = !c.activa ? 'activada' : 'desactivada';
        this.toast.exito(`Cuenta ${estado}`);
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

  confirmDelete(c: CuentaCOA) {
    this.openDialog(
      {
        title: '¿Eliminar cuenta?',
        message: `Se eliminará la cuenta "${c.code} - ${c.name}" de forma permanente.`,
        confirmLabel: 'Sí, eliminar',
        type: 'danger',
      },
      () => {
        this.coaService.eliminarCuenta(c.code).subscribe({
          next: () => {
            this.toast.exito('Cuenta eliminada');
            this.load();
            this.cdr.markForCheck();
          },
          error: (err: any) => {
            const msg = err?.error?.message || 'Error al eliminar cuenta';
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
