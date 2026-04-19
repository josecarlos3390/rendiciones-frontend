import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  TemplateRef,
  ViewChild,
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
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { CuentaCOA } from '@models/coa.model';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig, DataTableAction } from '@shared/data-table';
import { BooleanBadgeComponent } from '@shared/boolean-badge/boolean-badge.component';
import { StatusBadgeComponent } from '@shared/status-badge';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

import { CoaFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-coa',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormModalComponent,
    FormFieldComponent,
    CoaFiltersComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    DataTableComponent,
    BooleanBadgeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './coa.component.html',
  styleUrls: ['./coa.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoaComponent extends AbstractCrudListComponent<CuentaCOA> implements OnInit {
  @ViewChild('codeCol', { static: true }) codeCol!: TemplateRef<any>;
  @ViewChild('nameCol', { static: true }) nameCol!: TemplateRef<any>;
  @ViewChild('formatCodeCol', { static: true }) formatCodeCol!: TemplateRef<any>;
  @ViewChild('asociadaCol', { static: true }) asociadaCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  readonly store = new CrudListStore<CuentaCOA>({ limit: 10, searchFields: ['code', 'name'] });

  tableConfig!: DataTableConfig;
  tableActions: DataTableAction[] = [];

  showForm = false;
  editingCuenta: CuentaCOA | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: Record<string, unknown> | null = null;

  constructor(
    public auth: AuthService,
    private coaService: CoaService,
    private toast: ToastService,
    private fb: FormBuilder,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
  }

  ngOnInit() {
    this.buildForm();
    this.form.statusChanges.subscribe(() => this.cdr.markForCheck());
    this.buildTableConfig();
    Promise.resolve().then(() => {
      this.load();
      this._applyActivaFilter();
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
    this.store.load(this.coaService.getCuentas(), onComplete);
  }

  protected override getActiva(item: CuentaCOA): boolean {
    return item.activa;
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
            this.errorHandler.handle(err, 'Error al actualizar cuenta', this.cdr);
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
            this.errorHandler.handle(err, 'Error al crear cuenta', this.cdr);
          },
        });
    }
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'code', header: 'Código', cellTemplate: this.codeCol, mobile: { primary: true } },
        { key: 'name', header: 'Nombre', cellTemplate: this.nameCol },
        { key: 'formatCode', header: 'Format Code', cellTemplate: this.formatCodeCol, mobile: { hide: true } },
        { key: 'asociada', header: 'Asociada', align: 'center', cellTemplate: this.asociadaCol, mobile: { hide: true } },
        { key: 'activa', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: this.tableActions,
      striped: true,
      hoverable: true,
    };

    this.tableActions = [
      { id: 'edit', label: 'Editar', icon: ICON_EDIT },
      { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
    ];
  }

  onTableAction(event: { action: string; item: CuentaCOA }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  rowClassFn = (c: CuentaCOA): string => (!c.activa ? 'inactive-row' : '');

  // ── Acciones rápidas ─────────────────────────────────────

  toggleActiva(c: CuentaCOA) {
    this.coaService.toggleActivo(c.code).subscribe({
      next: () => {
        const estado = !c.activa ? 'activada' : 'desactivada';
        this.toast.exito(`Cuenta ${estado}`);
        this.load();
        this.cdr.markForCheck();
      },
      error: (err: any) => this.errorHandler.handle(err, 'Error al cambiar estado', this.cdr),
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(c: CuentaCOA) {
    this.confirmDialog.ask({
      title: '¿Eliminar cuenta?',
      message: `Se eliminará la cuenta "${c.code} - ${c.name}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.coaService.eliminarCuenta(c.code).subscribe({
        next: () => {
          this.toast.exito('Cuenta eliminada');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar cuenta', this.cdr),
      });
    });
  }
}
