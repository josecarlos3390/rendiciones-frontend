import { Directive, HostBinding, Input } from '@angular/core';

/**
 * NumericInputmodeDirective
 *
 * Aplica automáticamente el atributo `inputmode` correcto a todos los
 * inputs numéricos del formulario, mejorando la experiencia en teclados
 * móviles (especialmente iOS/Android).
 *
 * Uso:
 *   - Sin parámetro o inputmode="decimal": precios, montos, descuentos, costos, pesos
 *   - inputmode="numeric": cantidades enteras (sin decimales)
 *
 * Selector: input[type=number]  →  se aplica a TODOS los number inputs
 * automáticamente cuando el componente importa esta directiva.
 *
 * Registro: agregar NumericInputmodeDirective al array `imports` de cada
 * componente standalone que tenga inputs de tipo number.
 *
 * Comportamiento por defecto:
 *   - Si el input tiene step="1" o min sin decimales → inputmode="numeric"
 *   - En cualquier otro caso → inputmode="decimal"
 *
 * Se puede sobreescribir con [inputmode]="'numeric'" en el HTML si hace falta.
 */
@Directive({
  standalone: true,
  selector: 'input[type=number]',
})
export class NumericInputmodeDirective {
  /**
   * Permite sobreescribir el inputmode desde el HTML:
   *   <input type="number" inputmode="numeric" ... />
   * Si no se especifica, se infiere automáticamente desde el atributo `step`.
   */
  @Input() inputmode: 'decimal' | 'numeric' | 'tel' | 'text' = 'decimal';

  @HostBinding('attr.inputmode')
  get resolvedInputmode(): string {
    return this.inputmode;
  }
}