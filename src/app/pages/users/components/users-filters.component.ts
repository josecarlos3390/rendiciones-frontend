/**
 * UsersFiltersComponent - Componente dumb para filtros de usuarios
 * @Input search: string - Término de búsqueda
 * @Input loading: boolean - Estado de carga
 * @Output searchChange: EventEmitter<string> - Cambio en búsqueda
 * @Output searchCleared: EventEmitter<void> - Búsqueda limpiada
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from '@shared/debounce';

@Component({
  selector: 'app-users-filters',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  template: `
    <div class="filter-bar">
      <div class="filter-field">
        <label>Buscar</label>
        <app-search-input
          placeholder="Buscar por nombre o usuario..."
          [debounceTime]="300"
          [search]="search"
          (valueChange)="onSearchChange($event)"
          (cleared)="onSearchCleared()">
        </app-search-input>
      </div>
      <span class="filter-count" *ngIf="!loading">
        {{ count }} usuario{{ count !== 1 ? 's' : '' }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .filter-bar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      padding: 16px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
    }
    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 250px;
      max-width: 400px;
    }
    .filter-field label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .filter-count {
      font-size: var(--text-sm);
      color: var(--text-muted);
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .filter-field {
        max-width: none;
      }
      .filter-count {
        align-self: flex-end;
      }
    }
  `],
})
export class UsersFiltersComponent {
  @Input() search = '';
  @Input() loading = false;
  @Input() count = 0;

  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }
}
