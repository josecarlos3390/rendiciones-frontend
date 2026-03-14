import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea una fecha ISO o timestamp a dd/mm/yyyy.
 * Acepta strings tipo '2026-03-14', '2026-03-14T00:00:00.000Z', etc.
 * Devuelve '' si el valor es nulo, vacío o no parseable.
 *
 * Uso: {{ rendicion.U_FechaIni | ddmmyyyy }}
 */
@Pipe({ name: 'ddmmyyyy', standalone: true, pure: true })
export class DdmmyyyyPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const part = value.substring(0, 10); // toma yyyy-mm-dd
    const [y, m, d] = part.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }
}