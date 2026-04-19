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

import { DimensionesService } from '@services/dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { Dimension } from '@models/dimension.model';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig, DataTableAction } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

import { DimensionesFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-dimensiones',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormModalComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    DimensionesFiltersComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './dimensiones.component.html',
  styleUrls: ['./dimensiones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DimensionesComponent extends AbstractCrudListComponent<Dimension> implements OnInit {
  @ViewChild('codeCol', { static: true }) codeCol!: TemplateRef<any>;
  @ViewChild('nameCol', { static: true }) nameCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  readonly store = new CrudListStore<Dimension>({ limit: 10, searchFields: ['name', 'descripcion'] });

  tableConfig!: DataTableConfig;
  tableActions: DataTableAction[] = [];

  showForm = false;
  editingDimension: Dimension | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: Record<string, unknown> | null = null;

  constructor(
    public auth: AuthService,
    private dimensionesService: DimensionesService,
    private toast: ToastService,
    private fb: FormBuilder,
    private dirtyService: FormDirtyService,
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
    this.store.load(this.dimensionesService.getDimensiones(), onComplete);
  }

  protected override getActiva(item: Dimension): boolean {
    return item.activa;
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
            this.errorHandler.handle(err, 'Error al actualizar dimensión', this.cdr);
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
            this.errorHandler.handle(err, 'Error al crear dimensión', this.cdr);
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
      error: (err: any) => this.errorHandler.handle(err, 'Error al cambiar estado', this.cdr),
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(d: Dimension) {
    this.confirmDialog.ask({
      title: '¿Eliminar dimensión?',
      message: `Se eliminará la dimensión "${d.code} - ${d.name}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.dimensionesService.eliminarDimension(d.code).subscribe({
        next: () => {
          this.toast.exito('Dimensión eliminada');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar dimensión', this.cdr),
      });
    });
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'code', header: 'Código', cellTemplate: this.codeCol, mobile: { primary: true } },
        { key: 'name', header: 'Nombre', cellTemplate: this.nameCol },
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

  onTableAction(event: { action: string; item: Dimension }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  rowClassFn = (d: Dimension): string => (!d.activa ? 'inactive-row' : '');

}
