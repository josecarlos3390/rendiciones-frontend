import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

/**
 * Servicio para gestionar el estado "dirty" (cambios sin guardar) de formularios.
 * Centraliza la lógica que se repetía en múltiples componentes.
 */

export interface DirtyCheckConfig {
  /** Campos a excluir de la comparación */
  excludeFields?: string[];
  /** Campos a incluir (si se especifica, solo estos se comparan) */
  includeFields?: string[];
  /** Función de comparación personalizada */
  compareFn?: (current: unknown, initial: unknown) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormDirtyService {

  /**
   * Compara los valores actuales del formulario con los valores iniciales.
   * @param form FormGroup a comparar
   * @param initialValues Valores iniciales del formulario
   * @param config Configuración opcional
   * @returns true si hay cambios, false si son iguales
   */
  isDirty(form: FormGroup | null | undefined, initialValues: Record<string, unknown> | null, config?: DirtyCheckConfig): boolean {
    if (!form || !initialValues) return true; // Sin valores iniciales = siempre dirty
    
    const currentValues = form.getRawValue();
    const fields = this.getFieldsToCompare(currentValues, config);
    
    for (const field of fields) {
      const current = currentValues[field];
      const initial = initialValues[field];
      
      if (config?.compareFn) {
        if (config.compareFn(current, initial)) return true;
      } else {
        if (JSON.stringify(current) !== JSON.stringify(initial)) return true;
      }
    }
    
    return false;
  }

  /**
   * Verifica si un campo específico fue modificado.
   * @param control Control del formulario
   * @param initialValue Valor inicial del campo
   * @returns true si el campo cambió
   */
  fieldChanged(control: AbstractControl | null | undefined, initialValue: unknown): boolean {
    if (!control) return false;
    return JSON.stringify(control.value) !== JSON.stringify(initialValue);
  }

  /**
   * Crea un snapshot de los valores del formulario para usar como valores iniciales.
   * @param form FormGroup
   * @returns Copia profunda de los valores
   */
  createSnapshot(form: FormGroup | null | undefined): Record<string, unknown> | null {
    if (!form) return null;
    return JSON.parse(JSON.stringify(form.getRawValue()));
  }

  /**
   * Resetea el estado de dirty del formulario actualizando los valores iniciales.
   * @param form FormGroup
   * @returns Nuevos valores iniciales
   */
  resetDirty(form: FormGroup | null | undefined): Record<string, unknown> | null {
    return this.createSnapshot(form);
  }

  /**
   * Obtiene la lista de campos a comparar según la configuración.
   */
  private getFieldsToCompare(values: any, config?: DirtyCheckConfig): string[] {
    const allFields = Object.keys(values);
    
    if (config?.includeFields) {
      return config.includeFields.filter(f => allFields.includes(f));
    }
    
    if (config?.excludeFields) {
      return allFields.filter(f => !config.excludeFields!.includes(f));
    }
    
    return allFields;
  }

  /**
   * Calcula qué campos específicos fueron modificados.
   * @returns Array con los nombres de los campos modificados
   */
  getChangedFields(form: FormGroup | null | undefined, initialValues: any): string[] {
    if (!form || !initialValues) return [];
    
    const currentValues = form.getRawValue();
    const changed: string[] = [];
    
    for (const key of Object.keys(currentValues)) {
      if (JSON.stringify(currentValues[key]) !== JSON.stringify(initialValues[key])) {
        changed.push(key);
      }
    }
    
    return changed;
  }

  /**
   * Obtiene un resumen de los cambios para debugging o logging.
   */
  getChangesSummary(form: FormGroup | null | undefined, initialValues: any): Record<string, { from: any, to: any }> {
    if (!form || !initialValues) return {};
    
    const currentValues = form.getRawValue();
    const summary: Record<string, { from: any, to: any }> = {};
    
    for (const key of Object.keys(currentValues)) {
      const from = initialValues[key];
      const to = currentValues[key];
      if (JSON.stringify(from) !== JSON.stringify(to)) {
        summary[key] = { from, to };
      }
    }
    
    return summary;
  }
}
