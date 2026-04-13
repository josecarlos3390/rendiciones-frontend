import {
  Component, Input, Optional, Host, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';

/**
 * Componente reutilizable para campos de formulario estandarizados.
 * 
 * Uso básico:
 * <app-form-field
 *   label="Nombre"
 *   [required]="true"
 *   hint="Máximo 100 caracteres"
 *   errorMessage="El nombre es obligatorio"
 *   controlName="nombre">
 *   <input type="text" formControlName="nombre" />
 * </app-form-field>
 * 
 * Uso con control personalizado:
 * <app-form-field
 *   label="Tipo Documento"
 *   [required]="true"
 *   [control]="form.get('tipoDoc')">
 *   <app-select ...></app-select>
 * </app-form-field>
 */

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-field" 
         [class.field-changed]="showChanged && isChanged"
         [class.field-invalid]="showError && hasError"
         [class.field-disabled]="isDisabled">
      
      <!-- Label -->
      <label class="form-field__label" *ngIf="label">
        {{ label }}
        <span class="required" *ngIf="required">*</span>
        <span class="optional" *ngIf="showOptional && !required">(opcional)</span>
      </label>

      <!-- Input container -->
      <div class="form-field__input-wrapper">
        <ng-content></ng-content>
        
        <!-- Icono de estado -->
        <span class="form-field__status-icon" *ngIf="showStatusIcon && hasError">
          ⚠️
        </span>
      </div>

      <!-- Hint -->
      <span class="form-field__hint" *ngIf="hint && !hasError">{{ hint }}</span>

      <!-- Error message -->
      <span class="form-field__error" *ngIf="showError && hasError">
        {{ errorText }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .form-field__label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-heading);
      display: flex;
      align-items: center;
      gap: 4px;

      .required {
        color: var(--color-danger);
      }

      .optional {
        color: var(--text-muted);
        font-weight: var(--weight-normal);
        font-size: var(--text-xs);
      }
    }

    .form-field__input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    ::ng-deep .form-field__input-wrapper > *:first-child {
      width: 100%;
    }

    .form-field__status-icon {
      position: absolute;
      right: 12px;
      font-size: 14px;
      pointer-events: none;
    }

    .form-field__hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
    }

    .form-field__error {
      font-size: var(--text-xs);
      color: var(--color-danger);
      display: flex;
      align-items: center;
      gap: 4px;

      &::before {
        content: '⚠️';
        font-size: 10px;
      }
    }

    /* Estados */
    .form-field.field-changed {
      ::ng-deep input,
      ::ng-deep select,
      ::ng-deep textarea {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-bg);
      }
    }

    .form-field.field-invalid {
      ::ng-deep input,
      ::ng-deep select,
      ::ng-deep textarea {
        border-color: var(--color-danger);
        background-color: var(--color-danger-bg, #fef2f2);
      }
    }

    .form-field.field-disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  `]
})
export class FormFieldComponent {
  /** Label del campo */
  @Input() label = '';
  
  /** Indica si el campo es requerido (muestra *) */
  @Input() required = false;
  
  /** Muestra texto (opcional) cuando no es requerido */
  @Input() showOptional = false;
  
  /** Texto de ayuda */
  @Input() hint = '';
  
  /** Mensaje de error personalizado */
  @Input() errorMessage = '';
  
  /** Control de formulario (para detectar errores automáticamente) */
  @Input() control: AbstractControl | null = null;
  
  /** Nombre del control (alternativa a control, busca en formGroup padre) */
  @Input() controlName = '';
  
  /** Mostrar indicador de campo modificado */
  @Input() showChanged = false;
  
  /** Valor inicial para comparar si cambió */
  @Input() initialValue: any = null;
  
  /** Mostrar icono de error */
  @Input() showStatusIcon = false;
  
  /** Deshabilitar visualmente */
  @Input() disabled = false;

  constructor(
    @Optional() @Host() private formGroup: FormGroupDirective
  ) {}

  /** Obtiene el control de formulario */
  get formControl(): AbstractControl | null {
    if (this.control) return this.control;
    if (this.controlName && this.formGroup?.control) {
      return this.formGroup.control.get(this.controlName);
    }
    return null;
  }

  /** Indica si hay error de validación */
  get hasError(): boolean {
    const ctrl = this.formControl;
    if (!ctrl) return false;
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  /** Texto de error a mostrar */
  get errorText(): string {
    if (this.errorMessage) return this.errorMessage;
    
    const ctrl = this.formControl;
    if (!ctrl?.errors) return 'Campo inválido';

    // Mensajes por tipo de error
    if (ctrl.errors['required']) return 'Este campo es obligatorio';
    if (ctrl.errors['minlength']) {
      const required = ctrl.errors['minlength'].requiredLength;
      return `Mínimo ${required} caracteres`;
    }
    if (ctrl.errors['maxlength']) {
      const required = ctrl.errors['maxlength'].requiredLength;
      return `Máximo ${required} caracteres`;
    }
    if (ctrl.errors['min']) return 'Valor demasiado bajo';
    if (ctrl.errors['max']) return 'Valor demasiado alto';
    if (ctrl.errors['email']) return 'Email inválido';
    if (ctrl.errors['pattern']) return 'Formato inválido';
    
    return 'Campo inválido';
  }

  /** Indica si mostrar el error */
  get showError(): boolean {
    return this.hasError;
  }

  /** Indica si el campo fue modificado */
  get isChanged(): boolean {
    if (!this.showChanged) return false;
    const ctrl = this.formControl;
    if (!ctrl) return false;
    return JSON.stringify(ctrl.value) !== JSON.stringify(this.initialValue);
  }

  /** Indica si está deshabilitado */
  get isDisabled(): boolean {
    return this.disabled || !!this.formControl?.disabled;
  }
}
