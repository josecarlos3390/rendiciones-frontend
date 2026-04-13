/**
 * Dumb Component: CoaSearchComponent
 * Responsabilidad: UI de búsqueda y filtros para Plan de Cuentas
 * - Recibe estado actual vía @Input
 * - Emite cambios vía @Output
 * - Sin lógica de negocio, solo presentación
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SearchInputComponent } from '@shared/debounce';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';

type FiltroEstado = 'todas' | 'activas' | 'inactivas';

@Component({
  selector: 'app-coa-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SearchInputComponent,
    AppSelectComponent,
  ],
  template: `
    <div class="coa-search">
      <div class="coa-search__left">
        <div class="coa-search__field">
          <label class="coa-search__label">Buscar</label>
          <app-search-input
            [placeholder]="'Buscar por código o nombre...'"
            [debounceTime]="300"
            [search]="search"
            (valueChange)="onSearchChange($event)"
            (cleared)="onSearchCleared()">
          </app-search-input>
        </div>
        
        <div class="coa-search__field coa-search__field--select">
          <label class="coa-search__label">Estado</label>
          <app-select
            [options]="estadoOptions"
            [value]="filterActiva"
            [placeholder]="'Filtrar por estado'"
            (valueChange)="onFilterChange($event)">
          </app-select>
        </div>
      </div>
      
      <span class="coa-search__count" *ngIf="!loading">
        {{ filteredCount }} cuenta{{ filteredCount !== 1 ? 's' : '' }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .coa-search {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4, 1rem);
      margin-bottom: var(--space-4, 1rem);
      padding: var(--space-4, 1rem);
      background: var(--bg-surface, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: var(--radius-lg, 0.5rem);
      box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05));

      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .coa-search__left {
      display: flex;
      align-items: flex-end;
      gap: var(--space-4, 1rem);
      flex-wrap: wrap;

      @media (max-width: 640px) {
        flex-direction: column;
        align-items: stretch;
      }
    }

    .coa-search__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
      min-width: 200px;

      @media (max-width: 640px) {
        min-width: unset;
        width: 100%;
      }

      &--select {
        min-width: 160px;
      }
    }

    .coa-search__label {
      font-size: var(--text-sm, 0.875rem);
      font-weight: 500;
      color: var(--text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .coa-search__count {
      font-size: var(--text-sm, 0.875rem);
      color: var(--text-secondary, #6b7280);
      font-weight: 500;
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoaSearchComponent {
  @Input() search = '';
  @Input() filterActiva: FiltroEstado = 'todas';
  @Input() filteredCount = 0;
  @Input() loading = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<FiltroEstado>();

  readonly estadoOptions: SelectOption<FiltroEstado>[] = [
    { value: 'todas', label: 'Todas', icon: '🔍' },
    { value: 'activas', label: 'Activas', icon: '✅' },
    { value: 'inactivas', label: 'Inactivas', icon: '⭕' },
  ];

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }

  onFilterChange(value: FiltroEstado): void {
    this.filterChange.emit(value);
  }
}
