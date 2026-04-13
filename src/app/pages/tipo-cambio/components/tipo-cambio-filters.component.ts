/**
 * TipoCambioFiltersComponent - Filtros para tipo de cambio
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';

@Component({
  selector: 'app-tipo-cambio-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSelectComponent],
  template: `
    <div class="filter-bar">
      <div class="filter-left">
        <div class="filter-field filter-field--select">
          <label>Moneda</label>
          <app-select
            [options]="monedaOptions"
            [value]="filterMoneda"
            placeholder="Todas las monedas"
            (valueChange)="onMonedaChange($event)">
          </app-select>
        </div>
        <div class="filter-field">
          <label>Fecha desde</label>
          <input 
            type="date" 
            [ngModel]="filterFechaDesde"
            (ngModelChange)="onFechaDesdeChange($event)"
            class="filter-date"
          />
        </div>
        <div class="filter-field">
          <label>Fecha hasta</label>
          <input 
            type="date" 
            [ngModel]="filterFechaHasta"
            (ngModelChange)="onFechaHastaChange($event)"
            class="filter-date"
          />
        </div>
        <button class="btn btn-ghost btn-sm" (click)="onReset()">
          Limpiar
        </button>
      </div>
      <span class="filter-count" *ngIf="!loading">
        {{ count }} tasa{{ count !== 1 ? 's' : '' }}
      </span>
    </div>
  `,
  styles: [`
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
    }

    .filter-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 4px;

      label {
        font-size: var(--text-xs);
        font-weight: var(--weight-medium);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      input {
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        background: var(--bg-surface);
        color: var(--text-body);

        &:focus {
          outline: none;
          border-color: var(--color-primary);
        }
      }
    }

    .filter-field--select {
      min-width: 180px;
    }

    .filter-count {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-left {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-field {
        width: 100%;
      }
    }
  `],
})
export class TipoCambioFiltersComponent {
  @Input() monedaOptions: SelectOption<string>[] = [];
  @Input() filterMoneda = '';
  @Input() filterFechaDesde = '';
  @Input() filterFechaHasta = '';
  @Input() count = 0;
  @Input() loading = false;

  @Output() monedaChange = new EventEmitter<string>();
  @Output() fechaDesdeChange = new EventEmitter<string>();
  @Output() fechaHastaChange = new EventEmitter<string>();
  @Output() reset = new EventEmitter<void>();

  onMonedaChange(value: string): void {
    this.monedaChange.emit(value);
  }

  onFechaDesdeChange(value: string): void {
    this.fechaDesdeChange.emit(value);
  }

  onFechaHastaChange(value: string): void {
    this.fechaHastaChange.emit(value);
  }

  onReset(): void {
    this.reset.emit();
  }
}
