/**
 * ProyectosFiltersComponent - Filtros para proyectos
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSelectComponent, SelectOption } from '@shared/app-select/app-select.component';
import { SearchInputComponent } from '@shared/debounce';

@Component({
  selector: 'app-proyectos-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSelectComponent, SearchInputComponent],
  template: `
    <div class="filter-bar">
      <div class="filter-left">
        <app-search-input
          [(ngModel)]="search"
          [placeholder]="'Buscar proyectos...'"
          (ngModelChange)="onSearchChange($event)">
        </app-search-input>

        <app-select
          [options]="estadoOptions"
          [value]="filterActivo"
          (valueChange)="onEstadoChange($event)">
        </app-select>

        <button class="btn btn-ghost btn-sm" (click)="onReset()">
          Limpiar
        </button>
      </div>
      <span class="filter-count" *ngIf="!loading">
        {{ count }} proyecto{{ count !== 1 ? 's' : '' }}
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
    .filter-count {
      font-size: var(--text-sm);
      color: var(--text-muted);
    }
    @media (max-width: 768px) {
      .filter-bar { flex-direction: column; align-items: stretch; }
      .filter-left { flex-direction: column; align-items: stretch; }
    }
  `],
})
export class ProyectosFiltersComponent {
  @Input() search = '';
  @Input() filterActivo: 'todos' | 'activos' | 'inactivos' = 'todos';
  @Input() estadoOptions: SelectOption<string>[] = [];
  @Input() count = 0;
  @Input() loading = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() estadoChange = new EventEmitter<string>();
  @Output() reset = new EventEmitter<void>();

  onSearchChange(value: string): void { this.searchChange.emit(value); }
  onEstadoChange(value: string): void { this.estadoChange.emit(value); }
  onReset(): void { this.reset.emit(); }
}
