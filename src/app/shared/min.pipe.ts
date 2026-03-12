import { Pipe, PipeTransform } from '@angular/core';

/**
 * Clamps a value between 0 and the second element of a two-element array.
 * Usage: [value, max] | min
 * Example: [pct, 100] | min  →  Math.min(Math.max(pct, 0), 100)
 */
@Pipe({ name: 'min', standalone: true })
export class MinPipe implements PipeTransform {
  transform([value, max]: [number, number]): number {
    return Math.min(Math.max(Number(value) || 0, 0), max);
  }
}
