import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para truncar texto
 * 
 * Uso:
 *   {{ texto | truncate:50 }}      // "texto largo..."
 *   {{ texto | truncate:50:'---' }} // "texto largo---"
 */
@Pipe({
  name: 'truncate',
  standalone: true
})
export class TruncatePipe implements PipeTransform {
  transform(value: string | null | undefined, maxLength: number, suffix = '...'): string {
    if (!value || value.length <= maxLength) return value || '';
    return value.substring(0, maxLength) + suffix;
  }
}

/**
 * Pipe para capitalizar texto
 * 
 * Uso:
 *   {{ 'hola mundo' | capitalize }}  // "Hola mundo"
 *   {{ 'hola mundo' | capitalize:'all' }}  // "Hola Mundo"
 */
@Pipe({
  name: 'capitalize',
  standalone: true
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string | null | undefined, mode: 'first' | 'all' = 'first'): string {
    if (!value) return '';
    
    if (mode === 'first') {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    
    return value
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

/**
 * Pipe para formatear NIT
 * 
 * Uso:
 *   {{ '123456789' | nit }}  // "1234567-8-9"
 */
@Pipe({
  name: 'nit',
  standalone: true
})
export class NitPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    
    const clean = value.replace(/[^0-9]/g, '');
    
    if (clean.length < 7) return value;
    
    // Formato: XXXXXXX-X-X o XXXXXXXX-X-X
    if (clean.length <= 9) {
      return `${clean.slice(0, -2)}-${clean.slice(-2, -1)}-${clean.slice(-1)}`;
    }
    
    return value;
  }
}

/**
 * Pipe para mostrar estado con badge
 * 
 * Uso:
 *   {{ 1 | estadoBadge }}  // HTML con clase para ABIERTO
 */
@Pipe({
  name: 'estadoBadge',
  standalone: true
})
export class EstadoBadgePipe implements PipeTransform {
  private readonly labels: Record<number, string> = {
    1: 'ABIERTO',
    2: 'CERRADO',
    3: 'ELIMINADO',
    4: 'ENVIADO',
    5: 'SINCRONIZADO',
    6: 'ERROR SYNC',
    7: 'APROBADO',
  };
  
  private readonly classes: Record<number, string> = {
    1: 'status-open',
    2: 'status-secondary',
    3: 'status-deleted',
    4: 'status-confirmed',
    5: 'status-sync-ok',
    6: 'status-sync-error',
    7: 'status-closed',
  };
  
  transform(value: number | null | undefined): { label: string; class: string } {
    if (value === null || value === undefined) {
      return { label: 'DESCONOCIDO', class: 'status-unknown' };
    }
    
    return {
      label: this.labels[value] || 'DESCONOCIDO',
      class: this.classes[value] || 'status-unknown',
    };
  }
}
