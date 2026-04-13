/**
 * RendicionFormComponent - Formulario de creación/edición de rendición
 * 
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 * No contiene lógica de negocio ni llama a servicios.
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field/form-field.component';
import { LoadingButtonComponent } from '@shared/loading-button/loading-button.component';
import { EmpleadoSearchComponent, Empleado } from '@shared/empleado-search/empleado-search.component';
import { CuentaCabeceraSelectComponent } from '@shared/cuenta-cabecera-select/cuenta-cabecera-select.component';

import { RendM } from '@models/rend-m.model';
import { Permiso } from '@models/permiso.model';
import { CuentaCabecera } from '@models/cuenta-cabecera.model';
import { FormDirtyService } from '@shared/form-dirty';

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
export class RendicionFormComponent implements OnInit, OnChanges {
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

  @Output() save = new EventEmitter<RendicionFormData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() empleadoChange = new EventEmitter<Empleado | null>();
  @Output() cuentaChange = new EventEmitter<CuentaCabecera | null>();

  form!: FormGroup;
  initialValues: any = null;

  constructor(
    private fb: FormBuilder,
    private dirtyService: FormDirtyService,
  ) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      if (this.editingRend) {
        this.patchEditValues();
      } else {
        this.resetForm();
      }
    }
  }

  private buildForm(): void {
    const montoValidators = this.fijarSaldo
      ? [Validators.required, Validators.min(0.01)]
      : [Validators.min(0)];

    this.form = this.fb.group({
      idPerfil: [null, [Validators.required]],
      cuenta: ['', [Validators.required, Validators.maxLength(25)]],
      nombreCuenta: ['', [Validators.required, Validators.maxLength(250)]],
      empleado: ['', [Validators.required, Validators.maxLength(25)]],
      nombreEmpleado: ['', [Validators.required, Validators.maxLength(250)]],
      objetivo: ['', [Validators.required, Validators.maxLength(250)]],
      fechaIni: ['', [Validators.required]],
      fechaFinal: ['', [Validators.required]],
      monto: [0, montoValidators],
      preliminar: ['', Validators.maxLength(25)],
    });
  }

  private patchEditValues(): void {
    if (!this.editingRend) return;

    const values = {
      idPerfil: this.editingRend.U_IdPerfil,
      cuenta: this.editingRend.U_Cuenta ?? '',
      nombreCuenta: this.editingRend.U_NombreCuenta ?? '',
      empleado: this.editingRend.U_Empleado ?? '',
      nombreEmpleado: this.editingRend.U_NombreEmpleado ?? '',
      objetivo: this.editingRend.U_Objetivo ?? '',
      fechaIni: this.editingRend.U_FechaIni?.substring(0, 10) ?? '',
      fechaFinal: this.editingRend.U_FechaFinal?.substring(0, 10) ?? '',
      monto: this.editingRend.U_Monto ?? 0,
      preliminar: this.editingRend.U_Preliminar ?? '',
    };

    this.form.patchValue(values);
    this.initialValues = { ...values };
  }

  private resetForm(): void {
    this.form.reset({
      idPerfil: this.permisoActivo?.U_IDPERFIL,
      monto: 0,
    });
    this.initialValues = null;
  }

  get isDirty(): boolean {
    return this.dirtyService.isDirty(this.form, this.initialValues);
  }

  get tieneMultiplesCuentas(): boolean {
    return this.cuentasCabecera.length > 1;
  }

  get empleadoRequired(): boolean {
    return this.cuentaEsAsociada !== 'N';
  }

  onEmpleadoSelected(empleado: Empleado | null): void {
    this.form.patchValue({
      empleado: empleado?.cardCode ?? '',
      nombreEmpleado: empleado?.cardName ?? '',
    });
    this.empleadoChange.emit(empleado);
  }

  onCuentaChange(cuenta: CuentaCabecera | null): void {
    this.form.patchValue({
      cuenta: cuenta?.U_CuentaFormatCode ?? '',
      nombreCuenta: cuenta?.U_CuentaNombre ?? '',
    });
    this.cuentaChange.emit(cuenta);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.getRawValue() as RendicionFormData);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  fieldChanged(name: string): boolean {
    if (!this.editingRend || !this.initialValues) return false;
    return this.form.get(name)?.value !== this.initialValues[name];
  }
}
