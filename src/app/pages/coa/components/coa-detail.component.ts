/**
 * Dumb Component: CoaDetailComponent
 * Responsabilidad: Formulario de creación/edición de cuenta COA
 * - Recibe modo (crear/editar) y datos vía @Input
 * - Emite acciones (guardar, cancelar) vía @Output
 * - Gestiona el estado del formulario localmente
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

import { CuentaCOA } from '@models/coa.model';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { FormFieldComponent } from '@shared/form-field';

export interface CoaDetailData {
  code: string;
  name: string;
  formatCode: string;
  asociada: boolean;
  activa: boolean;
}

@Component({
  selector: 'app-coa-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormModalComponent,
    FormFieldComponent,
  ],
  template: `
    <app-form-modal
      [title]="isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'"
      [subtitle]="editingCuenta?.code || null"
      [isOpen]="isOpen"
      [loading]="isSaving"
      [isEditing]="isEditing"
      [isDirty]="isDirty"
      [submitDisabled]="form.invalid"
      (save)="onSave()"
      (cancel)="onCancel()">
      
      <ng-template #formContent>
        <form [formGroup]="form" (ngSubmit)="onSave()" novalidate>
          <app-form-field
            label="Código"
            [required]="true"
            controlName="code"
            hint="Código único de la cuenta (ej: 110101, 42010001)"
            [disabled]="isEditing">
            <input type="text" formControlName="code"
              placeholder="110101" maxlength="50" autocomplete="off" />
          </app-form-field>

          <app-form-field
            label="Nombre"
            [required]="true"
            controlName="name"
            hint="Nombre descriptivo de la cuenta">
            <input type="text" formControlName="name"
              placeholder="Caja General" maxlength="250" autocomplete="off" />
          </app-form-field>

          <app-form-field
            label="Format Code"
            controlName="formatCode"
            hint="Código para formatos de impresión (si es diferente)">
            <input type="text" formControlName="formatCode"
              placeholder="110101" maxlength="50" autocomplete="off" />
          </app-form-field>

          <div class="coa-detail__toggles">
            <div class="coa-detail__toggle">
              <label class="coa-detail__toggle-label">Cuenta Asociada/Título</label>
              <div class="coa-detail__toggle-wrapper">
                <label class="u-toggle">
                  <input type="checkbox" formControlName="asociada" />
                  <span class="u-toggle-slider"></span>
                </label>
                <span class="coa-detail__toggle-status" [class.active]="form.get('asociada')?.value">
                  {{ form.get('asociada')?.value ? 'SÍ' : 'NO' }}
                </span>
              </div>
              <span class="coa-detail__toggle-hint">Las cuentas título no permiten movimientos</span>
            </div>

            <div class="coa-detail__toggle">
              <label class="coa-detail__toggle-label">Activa</label>
              <div class="coa-detail__toggle-wrapper">
                <label class="u-toggle">
                  <input type="checkbox" formControlName="activa" />
                  <span class="u-toggle-slider"></span>
                </label>
                <span class="coa-detail__toggle-status" [class.active]="form.get('activa')?.value">
                  {{ form.get('activa')?.value ? 'ACTIVA' : 'INACTIVA' }}
                </span>
              </div>
              <span class="coa-detail__toggle-hint">Solo las cuentas activas aparecen en selectores</span>
            </div>
          </div>
        </form>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    :host {
      display: block;
    }

    .coa-detail__toggles {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4, 1rem);
      margin-top: var(--space-4, 1rem);

      @media (max-width: 480px) {
        grid-template-columns: 1fr;
      }
    }

    .coa-detail__toggle {
      display: flex;
      flex-direction: column;
      gap: var(--space-2, 0.5rem);
    }

    .coa-detail__toggle-label {
      font-size: var(--text-sm, 0.875rem);
      font-weight: 500;
      color: var(--text-main, #111827);
    }

    .coa-detail__toggle-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-3, 0.75rem);
    }

    .coa-detail__toggle-status {
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      color: var(--text-muted, #9ca3af);
      transition: color 0.15s ease;

      &.active {
        color: var(--color-success, #10b981);
      }
    }

    .coa-detail__toggle-hint {
      font-size: var(--text-xs, 0.75rem);
      color: var(--text-secondary, #6b7280);
    }

    /* Toggle Switch Styles */
    :host ::ng-deep .u-toggle {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .u-toggle-slider {
          background-color: var(--color-primary, #3b82f6);
        }

        &:checked + .u-toggle-slider:before {
          transform: translateX(20px);
        }
      }
    }

    :host ::ng-deep .u-toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-muted, #e5e7eb);
      transition: 0.3s;
      border-radius: 24px;

      &:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoaDetailComponent implements OnInit {
  @Input() isOpen = false;
  @Input() isEditing = false;
  @Input() isSaving = false;
  @Input() editingCuenta: CuentaCOA | null = null;

  @Output() save = new EventEmitter<CoaDetailData>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;
  private initialValues: any = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      name: ['', [Validators.required, Validators.maxLength(250)]],
      formatCode: ['', Validators.maxLength(50)],
      asociada: [false],
      activa: [true],
    });
  }

  get isDirty(): boolean {
    if (!this.isEditing) return true;
    if (!this.initialValues) return false;
    const curr = this.form.getRawValue();
    return JSON.stringify(curr) !== JSON.stringify(this.initialValues);
  }

  resetForm(): void {
    this.form.reset({
      code: '',
      name: '',
      formatCode: '',
      asociada: false,
      activa: true,
    });
    this.form.get('code')?.enable();
    this.initialValues = null;
  }

  setEditData(cuenta: CuentaCOA): void {
    this.form.reset({
      code: cuenta.code,
      name: cuenta.name,
      formatCode: cuenta.formatCode,
      asociada: cuenta.asociada,
      activa: cuenta.activa,
    });
    this.form.get('code')?.disable();
    this.initialValues = this.form.getRawValue();
  }

  onSave(): void {
    if (this.form.invalid || this.isSaving) return;
    this.save.emit(this.form.getRawValue());
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
