import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe para formatear fechas
 * 
 * Uso:
 *   {{ fecha | dateFormat }}           // DD/MM/YYYY
 *   {{ fecha | dateFormat:'datetime' }} // DD/MM/YYYY HH:mm
 *   {{ fecha | dateFormat:'time' }}     // HH:mm
 */
@Pipe({
  name: 'dateFormat',
  standalone: true
})
export class DateFormatPipe implements PipeTransform {
  transform(value: Date | string | null | undefined, format: 'date' | 'datetime' | 'time' | 'api' = 'date'): string {
    if (!value) return '-';
    
    const date = typeof value === 'string' ? new Date(value) : value;
    
    if (isNaN(date.getTime())) return '-';
    
    switch (format) {
      case 'api':
        return date.toISOString().split('T')[0];
      case 'datetime':
        return date.toLocaleString('es-BO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'time':
        return date.toLocaleTimeString('es-BO', {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'date':
      default:
        return date.toLocaleDateString('es-BO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    }
  }
}

/**
 * Pipe para mostrar tiempo relativo
 * 
 * Uso:
 *   {{ fecha | relativeTime }}  // "hace 2 horas", "hace 3 días"
 */
@Pipe({
  name: 'relativeTime',
  standalone: true
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: Date | string | null | undefined): string {
    if (!value) return '-';
    
    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSecs < 60) return 'hace un momento';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays < 30) return `hace ${diffDays} días`;
    if (diffMonths < 12) return `hace ${diffMonths} meses`;
    return `hace ${diffYears} años`;
  }
}
