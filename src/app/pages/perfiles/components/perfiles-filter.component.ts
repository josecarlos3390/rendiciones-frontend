import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from '@shared/debounce';

@Component({
  selector: 'app-perfiles-filter',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="filter-bar">
      <div class="filter-left">
        <div class="filter-field">
          <label>Buscar</label>
          <app-search-input
            placeholder="Buscar perfil..."
            [debounceTime]="300"
            [search]="search"
            (valueChange)="onSearchChange($event)"
            (cleared)="onSearchCleared()">
          </app-search-input>
        </div>
      </div>
      <span class="filter-count" *ngIf="!loading">
        {{ count }} perfil{{ count !== 1 ? 'es' : '' }}
      </span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .filter-left {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 280px;
    }

    .filter-field label {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .filter-count {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-weight: var(--weight-medium);
      white-space: nowrap;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .filter-left {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
      }

      .filter-field {
        width: 100%;
        min-width: 0;
      }
    }
  `]
})
export class PerfilesFilterComponent {
  @Input() search = '';
  @Input() count = 0;
  @Input() loading = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }
}
