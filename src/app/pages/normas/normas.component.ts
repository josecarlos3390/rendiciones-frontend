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

import { NormasService } from '@services/normas.service';
import { DimensionesService } from '@services/dimensiones.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { NormaConDimension } from '@models/norma.model';
import { Dimension } from '@models/dimension.model';
import { AuthService } from '@auth/auth.service';

import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH, ICON_TOGGLE_ON } from '@common/constants/icons';

import { NormasFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-normas',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    FormModalComponent,
    FormFieldComponent,
    NormasFiltersComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './normas.component.html',
  styleUrls: ['./normas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NormasComponent extends AbstractCrudListComponent<NormaConDimension> implements OnInit {
  @ViewChild('codeCol', { static: true }) codeCol!: TemplateRef<any>;
  @ViewChild('descCol', { static: true }) descCol!: TemplateRef<any>;
  @ViewChild('dimensionCol', { static: true }) dimensionCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  readonly store = new CrudListStore<NormaConDimension>({ limit: 10, searchFields: ['factorCode', 'descripcion', 'dimensionName'] });
  dimensiones: Dimension[] = [];

  tableConfig!: DataTableConfig;

  showForm = false;
  editingNorma: NormaConDimension | null = null;
  isSaving = false;
  form!: FormGroup;

  private initialValues: Record<string, unknown> | null = null;

  constructor(
    public auth: AuthService,
    private normasService: NormasService,
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
      this.loadDimensiones();
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

  get loadingState(): 'idle' | 'loading' | 'success' | 'empty' | 'error' {
    if (this.store.loading()) return 'loading';
    if (this.store.loadError()) return 'error';
    return this.store.filtered().length > 0 ? 'success' : 'empty';
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
    this.store.load(this.normasService.getNormas(), onComplete);
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

  protected override getActiva(item: NormaConDimension): boolean {
    return item.activa;
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
            this.errorHandler.handle(err, 'Error al actualizar norma', this.cdr);
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
            this.errorHandler.handle(err, 'Error al crear norma', this.cdr);
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
      error: (err: any) => this.errorHandler.handle(err, 'Error al cambiar estado', this.cdr),
    });
  }

  // ── Eliminar ─────────────────────────────────────────────

  confirmDelete(n: NormaConDimension) {
    this.confirmDialog.ask({
      title: '¿Eliminar norma?',
      message: `Se eliminará la norma "${n.factorCode} - ${n.descripcion}" de forma permanente.`,
      confirmLabel: 'Sí, eliminar',
      type: 'danger',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.normasService.eliminarNorma(n.factorCode).subscribe({
        next: () => {
          this.toast.exito('Norma eliminada');
          this.load();
          this.cdr.markForCheck();
        },
        error: (err: any) => this.errorHandler.handle(err, 'Error al eliminar norma', this.cdr),
      });
    });
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'factorCode', header: 'Código', cellTemplate: this.codeCol, mobile: { primary: true } },
        { key: 'descripcion', header: 'Nombre', cellTemplate: this.descCol },
        { key: 'dimensionName', header: 'Dimensión', cellTemplate: this.dimensionCol, mobile: { hide: true } },
        { key: 'activa', header: 'Estado', align: 'center', cellTemplate: this.estadoCol },
      ],
      showActions: true,
      actions: [
        { id: 'edit', label: 'Editar', icon: ICON_EDIT },
        {
          id: 'toggle',
          label: 'Activar/Desactivar',
          icon: ICON_TOGGLE_ON,
        },
        { id: 'delete', label: 'Eliminar', icon: ICON_TRASH, cssClass: 'danger' },
      ],
      striped: true,
      hoverable: true,
    };
  }

  onTableAction(event: { action: string; item: NormaConDimension }): void {
    switch (event.action) {
      case 'edit':
        this.openEdit(event.item);
        break;
      case 'toggle':
        this.toggleActiva(event.item);
        break;
      case 'delete':
        this.confirmDelete(event.item);
        break;
    }
  }

  rowClassFn = (n: NormaConDimension): string => (!n.activa ? 'inactive-row' : '');

}
