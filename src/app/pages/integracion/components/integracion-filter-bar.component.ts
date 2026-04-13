import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from '@shared/debounce';

/**
 * Dumb Component: Barra de filtros con búsqueda
 */
@Component({
  selector: 'app-integracion-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SearchInputComponent],
  template: `
    <div class="filter-bar">
      <app-search-input
        placeholder="Buscar por N°, usuario, perfil u objetivo..."
        [debounceTime]="300"
        [search]="search"
        (valueChange)="searchChange.emit($event)"
        (cleared)="searchCleared.emit()">
      </app-search-input>
      <span class="filter-count">
        {{ count }} rendición{{ count !== 1 ? 'es' : '' }}
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
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      
      app-search-input {
        flex: 1;
        min-width: 280px;
      }
    }
    
    .filter-count {
      font-size: var(--text-sm);
      color: var(--text-muted);
      white-space: nowrap;
    }
    
    @media (max-width: 640px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
        
        app-search-input {
          min-width: auto;
          width: 100%;
        }
      }
      
      .filter-count {
        text-align: center;
      }
    }
  `]
})
export class IntegracionFilterBarComponent {
  @Input() search = '';
  @Input() count = 0;
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();
}
