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
import { map } from 'rxjs/operators';

import { TipoCambioService, TipoCambio, CreateTipoCambioDto } from '@services/tipo-cambio.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogService } from '@core/confirm-dialog/confirm-dialog.service';
import { HttpErrorHandler } from '@core/http-error-handler';
import { CrudListStore } from '@core/crud-list-store';
import { AbstractCrudListComponent } from '@core/abstract-crud-list.component';
import { AuthService } from '@auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';
import { CrudPageHeaderComponent } from '@shared/crud-page-header/crud-page-header.component';
import { CrudEmptyStateComponent } from '@shared/crud-empty-state/crud-empty-state.component';
import { DataTableComponent, DataTableConfig } from '@shared/data-table';
import { ICON_EDIT, ICON_TRASH } from '@common/constants/icons';

import { TipoCambioFiltersComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-tipo-cambio',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AppSelectComponent,
    FormModalComponent,
    FormFieldComponent,
    CrudPageHeaderComponent,
    CrudEmptyStateComponent,
    TipoCambioFiltersComponent,
    DataTableComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './tipo-cambio.component.html',
  styleUrls: ['./tipo-cambio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipoCambioComponent extends AbstractCrudListComponent<TipoCambio> implements OnInit {
  @ViewChild('fechaCol', { static: true }) fechaCol!: TemplateRef<any>;
  @ViewChild('monedaCol', { static: true }) monedaCol!: TemplateRef<any>;
  @ViewChild('tasaCol', { static: true }) tasaCol!: TemplateRef<any>;
  @ViewChild('estadoCol', { static: true }) estadoCol!: TemplateRef<any>;

  readonly store = new CrudListStore<TipoCambio>({ limit: 10, searchFields: ['fecha', 'moneda'] });
  isOffline = false;

  // Filtros
  filterMoneda = '';
  filterFechaDesde = '';
  filterFechaHasta = '';

  // Modal de creación/edición
  showModal = false;
  editingId: number | null = null;
  form: FormGroup;
  saving = false;
  isDirty = false;

  // Monedas disponibles
  monedas = ['USD', 'EUR'];
  monedaOptions: SelectOption<string>[] = [
    { value: '', label: 'Todas las monedas', icon: '💱' },
    { value: 'USD', label: 'USD - Dólar americano', icon: '💵' },
    { value: 'EUR', label: 'EUR - Euro', icon: '💶' },
  ];
  monedaFormOptions: SelectOption<string>[] = [
    { value: 'USD', label: 'USD - Dólar americano', icon: '💵' },
    { value: 'EUR', label: 'EUR - Euro', icon: '💶' },
  ];

  tableConfig!: DataTableConfig;

  initialValues: Record<string, unknown> | null = null;

  constructor(
    private fb: FormBuilder,
    private service: TipoCambioService,
    private toast: ToastService,
    private auth: AuthService,
    protected override cdr: ChangeDetectorRef,
    private dirtyService: FormDirtyService,
    private confirmDialog: ConfirmDialogService,
    private errorHandler: HttpErrorHandler,
  ) {
    super();
    this.form = this.fb.group({
      fecha: [null, [Validators.required]],
      moneda: ['USD', [Validators.required]],
      tasa: [null, [Validators.required, Validators.min(0.0001)]],
    });

    this.form.valueChanges.subscribe(() => {
      this.isDirty = this.dirtyService.isDirty(this.form, this.initialValues);
    });
  }

  ngOnInit(): void {
    this.checkMode();
    this.buildTableConfig();
    this.loadTasas();
  }

  get isAdmin(): boolean {
    return this.auth.role === 'ADMIN';
  }

  private checkMode(): void {
    const appMode = localStorage.getItem('appMode') || 'ONLINE';
    this.isOffline = appMode === 'OFFLINE';
    this.cdr.markForCheck();
  }

  loadTasas(): void {
    this.store.load(
      this.service.findAll().pipe(
        map(data => data.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()))
      ),
      () => {
        if (!this.store.loadError()) {
          this.applyFilters();
        }
        this.cdr.markForCheck();
      }
    );
  }

  onMonedaChange(value: string): void {
    this.filterMoneda = value;
    this.applyFilters();
  }

  onFechaDesdeChange(value: string): void {
    this.filterFechaDesde = value;
    this.applyFilters();
  }

  onFechaHastaChange(value: string): void {
    this.filterFechaHasta = value;
    this.applyFilters();
  }

  onResetFilters(): void {
    this.resetFilters();
  }

  applyFilters(): void {
    if (this.filterMoneda) {
      this.store.setCustomFilter('moneda', t => t.moneda === this.filterMoneda);
    } else {
      this.store.setCustomFilter('moneda', null);
    }

    if (this.filterFechaDesde) {
      const desde = new Date(this.filterFechaDesde);
      this.store.setCustomFilter('fechaDesde', t => new Date(t.fecha) >= desde);
    } else {
      this.store.setCustomFilter('fechaDesde', null);
    }

    if (this.filterFechaHasta) {
      const hasta = new Date(this.filterFechaHasta);
      this.store.setCustomFilter('fechaHasta', t => new Date(t.fecha) <= hasta);
    } else {
      this.store.setCustomFilter('fechaHasta', null);
    }

    this.cdr.markForCheck();
  }

  protected override getActiva(item: TipoCambio): boolean {
    return item.activo === 'Y';
  }

  openCreate(): void {
    this.editingId = null;
    this.showModal = true;
    const hoy = new Date().toISOString().split('T')[0];
    setTimeout(() => {
      this.form.reset();
      this.form.setValue({
        fecha: hoy,
        moneda: 'USD',
        tasa: '',
      });
      this.form.get('fecha')?.enable();
      this.form.get('moneda')?.enable();
      this.initialValues = this.dirtyService.createSnapshot(this.form);
      this.isDirty = false;
      this.cdr.markForCheck();
    }, 0);
  }

  openEdit(tasa: TipoCambio): void {
    this.editingId = tasa.id;
    this.showModal = true;
    setTimeout(() => {
      this.form.reset();
      this.form.patchValue({
        fecha: tasa.fecha,
        moneda: tasa.moneda,
        tasa: tasa.tasa,
      });
      this.form.get('fecha')?.disable();
      this.form.get('moneda')?.disable();
      this.initialValues = this.dirtyService.createSnapshot(this.form);
      this.isDirty = false;
      this.cdr.markForCheck();
    }, 0);
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const rawValue = this.form.getRawValue();
    const dto: CreateTipoCambioDto = {
      fecha: rawValue.fecha,
      moneda: rawValue.moneda,
      tasa: Number(rawValue.tasa),
    };

    if (this.editingId) {
      this.service.update(this.editingId, { tasa: dto.tasa }).subscribe({
        next: () => {
          this.toast.exito('Tasa de cambio actualizada');
          this.saving = false;
          this.closeModal();
          this.loadTasas();
        },
        error: (err: any) => {
          this.saving = false;
          this.errorHandler.handle(err, 'Error al actualizar la tasa', this.cdr);
        },
      });
    } else {
      this.service.create(dto).subscribe({
        next: () => {
          this.toast.exito('Tasa de cambio guardada');
          this.saving = false;
          this.closeModal();
          this.loadTasas();
        },
        error: (err: any) => {
          this.saving = false;
          this.errorHandler.handle(err, 'Error al guardar la tasa de cambio', this.cdr);
        },
      });
    }
  }

  confirmDelete(tasa: TipoCambio): void {
    this.confirmDialog.ask({
      title: 'Eliminar Tasa de Cambio',
      message: `¿Eliminar la tasa de ${tasa.moneda} para el ${tasa.fecha}?`,
      type: 'danger',
      confirmLabel: 'Sí, eliminar',
    }).then((confirmed: boolean) => {
      if (!confirmed) return;
      this.service.remove(tasa.id).subscribe({
        next: () => {
          this.toast.exito('Tasa de cambio eliminada');
          this.loadTasas();
        },
        error: (err: any) => {
          this.errorHandler.handle(err, 'Error al eliminar la tasa', this.cdr);
        },
      });
    });
  }

  resetFilters(): void {
    this.filterMoneda = '';
    this.filterFechaDesde = '';
    this.filterFechaHasta = '';
    this.applyFilters();
  }

  formatTasa(tasa: number): string {
    return tasa.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  private buildTableConfig(): void {
    this.tableConfig = {
      columns: [
        { key: 'fecha', header: 'Fecha', cellTemplate: this.fechaCol, mobile: { primary: true } },
        { key: 'moneda', header: 'Moneda', cellTemplate: this.monedaCol },
        { key: 'tasa', header: 'Tasa (BOB)', align: 'right', cellTemplate: this.tasaCol },
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

  onTableAction(event: { action: string; item: TipoCambio }): void {
    if (event.action === 'edit') {
      this.openEdit(event.item);
    } else if (event.action === 'delete') {
      this.confirmDelete(event.item);
    }
  }

  rowClassFn = (t: TipoCambio): string => (t.activo !== 'Y' ? 'inactive-row' : '');
}
