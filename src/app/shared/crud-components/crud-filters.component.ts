/**
 * CrudFiltersComponent - Filtros reutilizables para CRUDs
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppSelectComponent, SelectOption } from '../app-select/app-select.component';
import { SearchInputComponent } from '../debounce';

@Component({
  selector: 'app-crud-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, AppSelectComponent, SearchInputComponent],
  template: `
    <div class="crud-filters">
      <app-search-input
        *ngIf="showSearch"
        [(ngModel)]="search"
        [placeholder]="searchPlaceholder"
        (ngModelChange)="onSearchChange($event)">
      </app-search-input>

      <app-select
        *ngIf="showStatusFilter"
        [options]="statusOptions"
        [value]="statusFilter"
        (valueChange)="onStatusChange($event)">
      </app-select>

      <ng-content select="[extraFilters]"></ng-content>

      <div class="filters-spacer"></div>

      <button *ngIf="showAddButton && !isReadonly" class="btn btn-primary" (click)="onAdd()">
        + {{ addButtonLabel }}
      </button>
    </div>
  `,
  styles: [`
    .crud-filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 16px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
    }

    .filters-spacer {
      flex: 1;
    }

    app-search-input {
      min-width: 240px;
    }

    @media (max-width: 640px) {
      .crud-filters {
        flex-direction: column;
        align-items: stretch;
      }

      app-search-input,
      app-select {
        width: 100%;
      }
    }
  `],
})
export class CrudFiltersComponent {
  @Input() showSearch = true;
  @Input() search = '';
  @Input() searchPlaceholder = 'Buscar...';

  @Input() showStatusFilter = true;
  @Input() statusFilter: string = 'todas';
  @Input() statusOptions: SelectOption<string>[] = [];

  @Input() showAddButton = true;
  @Input() addButtonLabel = 'Nuevo';
  @Input() isReadonly = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() statusChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onStatusChange(value: string): void {
    this.statusChange.emit(value);
  }

  onAdd(): void {
    this.add.emit();
  }
}
