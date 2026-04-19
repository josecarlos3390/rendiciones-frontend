/**
 * RendicionFormComponent - Formulario de creación/edición de rendición
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 * En pantalla ancha muestra 2 columnas; en móvil cambia a tabs automáticamente.
 */

import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy, SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormModalComponent, FormModalTab } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { LoadingButtonComponent } from '@shared/loading-button/loading-button.component';
import { EmpleadoSearchComponent, Empleado } from '@shared/empleado-search/empleado-search.component';
import { CuentaCabeceraSelectComponent } from '@shared/cuenta-cabecera-select/cuenta-cabecera-select.component';

import { RendM } from '@models/rend-m.model';
import { Permiso } from '@models/permiso.model';
import { CuentaCabecera } from '@models/cuenta-cabecera.model';
import { FormDirtyService } from '@shared/form-dirty';
import { BreakpointService } from '@services/breakpoint.service';
import { Subscription } from 'rxjs';

export interface RendicionFormData {
  idPerfil: number;
  cuenta: string;
  nombreCuenta: string;
  empleado: string;
  nombreEmpleado: string;
  objetivo: string;
  fechaIni: string;
  fechaFinal: string;
  monto: number;
  preliminar?: string;
}

@Component({
  selector: 'app-rendicion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormModalComponent,
    FormFieldComponent,
    LoadingButtonComponent,
    EmpleadoSearchComponent,
    CuentaCabeceraSelectComponent,
  ],
  templateUrl: './rendicion-form.component.html',
  styleUrls: ['./rendicion-form.component.scss'],
})
export class RendicionFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() editingRend: RendM | null = null;
  @Input() permisoActivo: Permiso | null = null;
  @Input() cuentasCabecera: CuentaCabecera[] = [];
  @Input() fijarSaldo = false;
  @Input() cuentaEsAsociada = 'Y';
  @Input() filtroEmpleadoCar = 'EMPIEZA';
  @Input() filtroEmpleado = '';
  @Input() editingPerfilNombre = '';
  @Input() initialCuenta = '';
  @Input() initialNombreCuenta = '';

  @Output() save = new EventEmitter<RendicionFormData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() empleadoChange = new EventEmitter<Empleado | null>();
  @Output() cuentaChange = new EventEmitter<CuentaCabecera | null>();

  form!: FormGroup;
  initialValues: Record<string, unknown> | null = null;

  // ── Tabs para móvil ──────────────────────────────────────────
  isMobile = false;
  activeTab = 'empleado';
  readonly mobileTabs: FormModalTab[] = [
    { id: 'empleado', label: 'Empleado y Período' },
    { id: 'cuenta',   label: 'Cuenta y Rendición' },
  ];

  private mobileSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private dirtyService: FormDirtyService,
    private cdr: ChangeDetectorRef,
    private breakpoint: BreakpointService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.mobileSub = this.breakpoint.isMobile$.subscribe(isMobile => {
      this.isMobile = isMobile;
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.activeTab = 'empleado'; // siempre empieza en el primer tab
      if (this.editingRend) {
        this.patchEditValues();
      } else {
        this.resetForm();
      }
    }
  }

  ngOnDestroy(): void {
    this.mobileSub?.unsubscribe();
  }

  // Tabs que se pasan al form-modal (solo en móvil)
  get activeTabs(): FormModalTab[] {
    return this.isMobile ? this.mobileTabs : [];
  }

  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }

  get isEmpleadoTab(): boolean { return !this.isMobile || this.activeTab === 'empleado'; }
  get isCuentaTab(): boolean   { return !this.isMobile || this.activeTab === 'cuenta'; }

  // ── Form ─────────────────────────────────────────────────────
  private buildForm(): void {
    const montoValidators = this.fijarSaldo
      ? [Validators.required, Validators.min(0.01)]
      : [Validators.min(0)];

    this.form = this.fb.group({
      idPerfil:       [null, [Validators.required]],
      cuenta:         ['',   [Validators.required, Validators.maxLength(25)]],
      nombreCuenta:   ['',   [Validators.required, Validators.maxLength(250)]],
      empleado:       ['',   [Validators.required, Validators.maxLength(25)]],
      nombreEmpleado: ['',   [Validators.required, Validators.maxLength(250)]],
      objetivo:       ['',   [Validators.required, Validators.maxLength(250)]],
      fechaIni:       ['',   [Validators.required]],
      fechaFinal:     ['',   [Validators.required]],
      monto:          [0,    montoValidators],
      preliminar:     ['',   Validators.maxLength(25)],
    });
  }

  private patchEditValues(): void {
    if (!this.editingRend) return;

    this.form.get('cuenta')?.enable({ emitEvent: false });
    this.form.get('nombreCuenta')?.enable({ emitEvent: false });
    this.form.get('empleado')?.enable({ emitEvent: false });
    this.form.get('nombreEmpleado')?.enable({ emitEvent: false });

    const values = {
      idPerfil:       this.editingRend.U_IdPerfil,
      cuenta:         this.editingRend.U_Cuenta ?? '',
      nombreCuenta:   this.editingRend.U_NombreCuenta ?? '',
      empleado:       this.editingRend.U_Empleado ?? '',
      nombreEmpleado: this.editingRend.U_NombreEmpleado ?? '',
      objetivo:       this.editingRend.U_Objetivo ?? '',
      fechaIni:       this.editingRend.U_FechaIni?.substring(0, 10) ?? '',
      fechaFinal:     this.editingRend.U_FechaFinal?.substring(0, 10) ?? '',
      monto:          this.editingRend.U_Monto ?? 0,
      preliminar:     this.editingRend.U_Preliminar ?? '',
    };

    this.form.patchValue(values);
    this.initialValues = { ...values };

    if (this.cuentasCabecera.length <= 1) {
      this.form.get('cuenta')?.disable({ emitEvent: false });
      this.form.get('nombreCuenta')?.disable({ emitEvent: false });
    }
    if (this.cuentaEsAsociada === 'N') {
      this.form.get('empleado')?.disable({ emitEvent: false });
      this.form.get('nombreEmpleado')?.disable({ emitEvent: false });
    }
  }

  private resetForm(): void {
    this.form.reset({
      idPerfil:     this.permisoActivo?.U_IDPERFIL,
      cuenta:       this.initialCuenta,
      nombreCuenta: this.initialNombreCuenta,
      monto:        0,
    });
    this.initialValues = null;

    if (this.cuentasCabecera.length <= 1) {
      this.form.get('cuenta')?.disable({ emitEvent: false });
      this.form.get('nombreCuenta')?.disable({ emitEvent: false });
    } else {
      this.form.get('cuenta')?.enable({ emitEvent: false });
      this.form.get('nombreCuenta')?.enable({ emitEvent: false });
    }

    const empleadoCtrl       = this.form.get('empleado');
    const nombreEmpleadoCtrl = this.form.get('nombreEmpleado');
    if (this.cuentaEsAsociada === 'N') {
      empleadoCtrl?.disable({ emitEvent: false });
      nombreEmpleadoCtrl?.disable({ emitEvent: false });
    } else {
      empleadoCtrl?.enable({ emitEvent: false });
      nombreEmpleadoCtrl?.enable({ emitEvent: false });
    }
  }

  // ── Getters ──────────────────────────────────────────────────
  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  fieldChanged(fieldName: string): boolean {
    if (!this.editingRend) return false;
    return this.form.get(fieldName)?.value !== this.initialValues?.[fieldName];
  }

  get tieneMultiplesCuentas(): boolean {
    return this.cuentasCabecera.length > 1;
  }

  get cuentaDisplayValue(): string {
    const raw = this.form.getRawValue();
    const codigo = raw.cuenta;
    if (!codigo) return '';
    const prefijo = this.cuentaEsAsociada === 'N' ? 'CN-' : 'CA-';
    return prefijo + codigo;
  }

  get empleadoRequired(): boolean {
    return this.cuentaEsAsociada !== 'N';
  }

  // ── Handlers ─────────────────────────────────────────────────
  onEmpleadoSelected(empleado: Empleado | null): void {
    this.form.patchValue({
      empleado:       empleado?.cardCode ?? '',
      nombreEmpleado: empleado?.cardName ?? '',
    });
    this.empleadoChange.emit(empleado);
  }

  onCuentaChange(cuenta: CuentaCabecera | null): void {
    this.form.patchValue({
      cuenta:       cuenta?.U_CuentaFormatCode ?? '',
      nombreCuenta: cuenta?.U_CuentaNombre ?? '',
    });
    this.cuentaChange.emit(cuenta);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Si hay errores en el tab que no está visible, cambiar a él
      if (this.isMobile) {
        const empleadoFields = ['empleado', 'fechaIni', 'fechaFinal'];
        const hasEmpleadoError = empleadoFields.some(f => this.form.get(f)?.invalid);
        if (hasEmpleadoError) this.activeTab = 'empleado';
        else this.activeTab = 'cuenta';
      }
      return;
    }
    this.save.emit(this.form.getRawValue() as RendicionFormData);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
