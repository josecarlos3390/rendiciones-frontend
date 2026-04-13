import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear moneda (Bolivianos)
 * 
 * Uso:
 *   {{ valor | bs }}
 *   {{ valor | bs:2 }}  // 2 decimales
 *   {{ valor | bs:0 }}  // sin decimales
 */
@Pipe({
  name: 'bs',
  standalone: true
})
export class CurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || value === '') return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) return '-';
    
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }
}

/**
 * Pipe para formatear número sin símbolo de moneda
 * 
 * Uso:
 *   {{ valor | numberFormat }}
 *   {{ valor | numberFormat:2 }}
 */
@Pipe({
  name: 'numberFormat',
  standalone: true
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number | string | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || value === '') return '-';
    
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) return '-';
    
    return new Intl.NumberFormat('es-BO', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }
}

/**
 * Pipe para formatear porcentaje
 * 
 * Uso:
 *   {{ 0.15 | percent }}      // 15%
 *   {{ 15 | percent:'value' }} // 15% (si ya es porcentaje)
 */
@Pipe({
  name: 'percent',
  standalone: true
})
export class PercentPipe implements PipeTransform {
  transform(value: number | string | null | undefined, type: 'decimal' | 'value' = 'decimal'): string {
    if (value === null || value === undefined || value === '') return '-';
    
    let num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) return '-';
    
    if (type === 'decimal') {
      num = num * 100;
    }
    
    return num.toFixed(0) + '%';
  }
}
