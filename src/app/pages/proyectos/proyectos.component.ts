import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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

import { ProyectosService } from '@services/proyectos.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { Proyecto } from '@models/proyecto.model';
import { AuthService } from '@auth/auth.service';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

import { ProyectosFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-proyectos',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormModalComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    ProyectosFiltersComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProyectosComponent extends AbstractCrudListComponent<Proyecto> implements OnInit {
  @ViewChild('codeCol', { static: true }) codeCol!: TemplateRef<any>;
  @ViewChild('nameCol', { static: true }) nameCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  readonly store = new CrudListStore<Proyecto>({ limit: 10, searchFields: ['code', 'name'] });

  tableConfig!: DataTableConfig;

  showForm = false;
  editingProyecto: Proyecto | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: Record<string, unknown> | null = null;

  constructor(
    public auth: AuthService,
    private proyectosService: ProyectosService,
    private toast: ToastService,
    private fb: FormBuilder,
    protected override cdr: ChangeDetectorRef,
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

  protected override getActiva(item: Proyecto): boolean {
    return item.activo;
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'code', header: 'Código', cellTemplate: this.codeCol, mobile: { hide: true } },
        { key: 'name', header: 'Nombre', cellTemplate: this.nameCol, mobile: { primary: true } },
        { key: 'activo', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: Proyecto }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  rowClassFn = (p: Proyecto): string => (!p.activo ? 'inactive-row' : '');

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
    this.store.load(this.proyectosService.getProyectos(), onComplete);
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
            this.errorHandler.handle(err, 'Error al actualizar proyecto', this.cdr);
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
            this.errorHandler.handle(err, 'Error al crear proyecto', this.cdr);
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
      error: (err: any) => this.errorHandler.handle(err, 'Error al cambiar estado', this.cdr),
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(p: Proyecto) {
    this.confirmDialog.ask({
      title: '¿Eliminar proyecto?',
      message: `Se eliminará el proyecto "${p.code} - ${p.name}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.proyectosService.eliminarProyecto(p.code).subscribe({
        next: () => {
          this.toast.exito('Proyecto eliminado');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar proyecto', this.cdr),
      });
    });
  }
}
