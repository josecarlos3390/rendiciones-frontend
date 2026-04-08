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

import { TipoCambioService, TipoCambio, CreateTipoCambioDto } from '../../services/tipo-cambio.service';
import { ToastService } from '../../core/toast/toast.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogConfig,
} from '../../core/confirm-dialog/confirm-dialog.component';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  standalone: true,
  selector: 'app-tipo-cambio',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogComponent,
    PaginatorComponent,
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

  // Confirm dialog
  confirmVisible = false;
  confirmConfig: ConfirmDialogConfig = {
    title: '',
    message: '',
  };
  private idToDelete: number | null = null;

  // Monedas disponibles
  monedas = ['USD', 'EUR'];

  constructor(
    private fb: FormBuilder,
    private service: TipoCambioService,
    private toast: ToastService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      fecha: ['', [Validators.required]],
      moneda: ['USD', [Validators.required]],
      tasa: ['', [Validators.required, Validators.min(0.0001)]],
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
   * Aplicar filtros
   */
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
    this.cdr.markForCheck();
  }

  /**
   * Abrir modal para crear
   */
  openCreate(): void {
    this.editingId = null;
    this.form.reset({
      fecha: new Date().toISOString().split('T')[0],
      moneda: 'USD',
      tasa: '',
    });
    this.showModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Abrir modal para editar
   */
  openEdit(tasa: TipoCambio): void {
    this.editingId = tasa.id;
    this.form.patchValue({
      fecha: tasa.fecha,
      moneda: tasa.moneda,
      tasa: tasa.tasa,
    });
    this.showModal = true;
    this.cdr.markForCheck();
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
    const dto: CreateTipoCambioDto = this.form.value;

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
          this.toast.exito('Tasa de cambio creada');
          this.saving = false;
          this.closeModal();
          this.loadTasas();
        },
        error: (err: any) => {
          this.saving = false;
          if (err.status === 409) {
            this.toast.error('Ya existe una tasa para esa fecha y moneda');
          } else {
            this.toast.error('Error al crear la tasa de cambio');
          }
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
}
