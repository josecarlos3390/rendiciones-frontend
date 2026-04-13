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

import { TipoCambioService, TipoCambio, CreateTipoCambioDto } from '@services/tipo-cambio.service';
import { ToastService } from '@core/toast/toast.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '@core/confirm-dialog/confirm-dialog.component';
import { FormModalComponent } from '@shared/form-modal';
import { StatusBadgeComponent } from '@shared/status-badge';
import { AuthService } from '../../auth/auth.service';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { ActionMenuItem } from '@shared/action-menu';
import { FormFieldComponent } from '@shared/form-field';
import { FormDirtyService } from '@shared/form-dirty';

import { TipoCambioFiltersComponent, TipoCambioTableComponent } from './components';

@Component({
  standalone: true,
  selector: 'app-tipo-cambio',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    AppSelectComponent,
    FormModalComponent,
    FormFieldComponent,
    TipoCambioFiltersComponent,
    TipoCambioTableComponent,
  ],
  templateUrl: './tipo-cambio.component.html',
  styleUrls: ['./tipo-cambio.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipoCambioComponent implements OnInit {
  tasas: TipoCambio[] = [];
  filtered: TipoCambio[] = [];
  loading = false;
  loadError = false;
  isOffline = false;

  // Filtros
  filterMoneda: string = '';
  filterFechaDesde: string = '';
  filterFechaHasta: string = '';

  // Modal de creación/edición
  showModal = false;
  editingId: number | null = null;
  form: FormGroup;
  saving = false;
  isDirty = false;

  // Confirm dialog
  confirmVisible = false;
  confirmConfig: ConfirmDialogConfig = {
    title: '',
    message: '',
  };
  private idToDelete: number | null = null;

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

  // Paginación
  page = 1;
  limit = 10;
  totalPages = 1;
  paged: TipoCambio[] = [];

  initialValues: any = null;

  constructor(
    private fb: FormBuilder,
    private service: TipoCambioService,
    private toast: ToastService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    private dirtyService: FormDirtyService,
  ) {
    this.form = this.fb.group({
      fecha: [null, [Validators.required]],
      moneda: ['USD', [Validators.required]],
      tasa: [null, [Validators.required, Validators.min(0.0001)]],
    });
    
    // Rastrear cambios en el formulario
    this.form.valueChanges.subscribe(() => {
      this.isDirty = this.dirtyService.isDirty(this.form, this.initialValues);
    });
  }

  ngOnInit(): void {
    this.checkMode();
    this.loadTasas();
  }

  /**
   * Verificar si estamos en modo OFFLINE
   */
  private checkMode(): void {
    const appMode = localStorage.getItem('appMode') || 'ONLINE';
    this.isOffline = appMode === 'OFFLINE';
    this.cdr.markForCheck();
  }

  /**
   * Cargar todas las tasas de cambio
   */
  loadTasas(): void {
    this.loading = true;
    this.loadError = false;

    this.service.findAll().subscribe({
      next: data => {
        this.tasas = data.sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
        this.toast.error('Error al cargar las tasas de cambio');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Aplicar filtros y paginación
   */
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
    let result = [...this.tasas];

    if (this.filterMoneda) {
      result = result.filter(t => t.moneda === this.filterMoneda);
    }

    if (this.filterFechaDesde) {
      const desde = new Date(this.filterFechaDesde);
      result = result.filter(t => new Date(t.fecha) >= desde);
    }

    if (this.filterFechaHasta) {
      const hasta = new Date(this.filterFechaHasta);
      result = result.filter(t => new Date(t.fecha) <= hasta);
    }

    this.filtered = result;
    this.updatePaging();
    this.cdr.markForCheck();
  }

  /**
   * Actualizar paginación
   */
  private updatePaging(): void {
    this.totalPages = Math.ceil(this.filtered.length / this.limit) || 1;
    
    // Ajustar página si está fuera de rango
    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }
    
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    this.paged = this.filtered.slice(start, end);
  }

  /**
   * Cambiar página
   */
  onPageChange(page: number): void {
    this.page = page;
    this.updatePaging();
    this.cdr.markForCheck();
  }

  /**
   * Cambiar límite de items por página
   */
  onLimitChange(limit: number): void {
    this.limit = limit;
    this.page = 1;
    this.updatePaging();
    this.cdr.markForCheck();
  }

  /**
   * Abrir modal para crear
   */
  openCreate(): void {
    this.editingId = null;
    this.showModal = true;
    
    // Resetear formulario con valores por defecto
    const hoy = new Date().toISOString().split('T')[0];
    
    // Usar setTimeout para asegurar que el DOM se actualice antes de setear valores
    setTimeout(() => {
      this.form.reset();
      this.form.setValue({
        fecha: hoy,
        moneda: 'USD',
        tasa: '',
      });
      
      // Habilitar campos que podrían estar deshabilitados
      this.form.get('fecha')?.enable();
      this.form.get('moneda')?.enable();
      
      // Guardar valores iniciales para dirty check
      this.initialValues = this.dirtyService.createSnapshot(this.form);
      this.isDirty = false;
      
      this.cdr.markForCheck();
    }, 0);
  }

  /**
   * Abrir modal para editar
   */
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
      
      // En edición, fecha y moneda no son editables
      this.form.get('fecha')?.disable();
      this.form.get('moneda')?.disable();
      
      // Guardar valores iniciales para dirty check
      this.initialValues = this.dirtyService.createSnapshot(this.form);
      this.isDirty = false;
      
      this.cdr.markForCheck();
    }, 0);
  }

  /**
   * Cerrar modal
   */
  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.form.reset();
    this.cdr.markForCheck();
  }

  /**
   * Guardar (crear o actualizar)
   */
  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    // Obtener todos los valores incluyendo campos deshabilitados
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
        error: () => {
          this.saving = false;
          this.toast.error('Error al actualizar la tasa');
          this.cdr.markForCheck();
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
          this.toast.error('Error al guardar la tasa de cambio');
          this.cdr.markForCheck();
        },
      });
    }
  }

  /**
   * Confirmar eliminación
   */
  confirmDelete(tasa: TipoCambio): void {
    this.idToDelete = tasa.id;
    this.confirmConfig = {
      title: 'Eliminar Tasa de Cambio',
      message: `¿Eliminar la tasa de ${tasa.moneda} para el ${tasa.fecha}?`,
      type: 'danger',
    };
    this.confirmVisible = true;
    this.cdr.markForCheck();
  }

  /**
   * Eliminar tasa
   */
  onConfirmDelete(): void {
    if (this.idToDelete === null) return;
    
    this.service.remove(this.idToDelete).subscribe({
      next: () => {
        this.toast.exito('Tasa de cambio eliminada');
        this.closeConfirm();
        this.loadTasas();
      },
      error: () => {
        this.toast.error('Error al eliminar la tasa');
        this.closeConfirm();
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Cerrar confirm dialog
   */
  closeConfirm(): void {
    this.confirmVisible = false;
    this.idToDelete = null;
    this.cdr.markForCheck();
  }

  /**
   * Resetear filtros
   */
  resetFilters(): void {
    this.filterMoneda = '';
    this.filterFechaDesde = '';
    this.filterFechaHasta = '';
    this.page = 1;
    this.applyFilters();
  }

  /**
   * Formatear número como moneda
   */
  formatTasa(tasa: number): string {
    return tasa.toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  /**
   * Obtener items del menú de acciones para una tasa
   */
  getActionMenuItems(tasa: TipoCambio): ActionMenuItem[] {
    return [
      {
        id: 'edit',
        label: 'Editar',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      },
      {
        id: 'delete',
        label: 'Eliminar',
        cssClass: 'danger',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
      },
    ];
  }

  /**
   * Manejar click en acción del menú
   */
  onActionClick(action: string, tasa: TipoCambio): void {
    if (action === 'edit') {
      this.openEdit(tasa);
    } else if (action === 'delete') {
      this.confirmDelete(tasa);
    }
  }
}
