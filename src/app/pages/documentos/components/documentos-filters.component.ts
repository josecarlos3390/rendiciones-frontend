import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Perfil } from '@models/perfil.model';
import { PerfilSelectComponent } from '@shared/perfil-select/perfil-select.component';
import { SearchInputComponent } from '@shared/debounce/search-input.component';

/**
 * Componente Dumb para filtros de documentos.
 * Maneja la selección de perfil y búsqueda.
 */
@Component({
  selector: 'app-documentos-filters',
  standalone: true,
  imports: [CommonModule, PerfilSelectComponent, SearchInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Selector de perfil -->
    <div class="filter-bar">
      <div class="filter-left">
        <div class="filter-field perfil-selector-inline">
          <label>Seleccione Perfil</label>
          <app-perfil-select
            placeholder="— Seleccione Perfil —"
            [value]="selectedPerfilId"
            (perfilChange)="perfilChange.emit($event)"
            (perfilObjChange)="perfilObjChange.emit($event)">
          </app-perfil-select>
        </div>
      </div>
    </div>

    <!-- Barra de búsqueda -->
    <div class="filter-bar" *ngIf="selectedPerfilId">
      <div class="filter-left">
        <div class="filter-field">
          <label>Buscar</label>
          <app-search-input
            placeholder="Buscar documento..."
            [debounceTime]="300"
            [search]="search"
            (valueChange)="searchChange.emit($event)"
            (cleared)="searchCleared.emit()">
          </app-search-input>
        </div>
      </div>
      <span class="filter-count" *ngIf="!loading">
        {{ filteredCount }} documento{{ filteredCount !== 1 ? 's' : '' }}
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
      gap: var(--spacing-md, 16px);
      margin-bottom: var(--spacing-md, 16px);
      flex-wrap: wrap;
    }

    .filter-left {
      display: flex;
      align-items: flex-end;
      gap: var(--spacing-md, 16px);
      flex-wrap: wrap;
    }

    .filter-field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 4px);

      label {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-label, #5a5a5a);
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
    }

    .perfil-selector-inline {
      min-width: 280px;
    }

    .filter-count {
      font-size: 13px;
      color: var(--text-muted, #666);
      font-weight: 500;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-left {
        width: 100%;
      }

      .filter-field {
        width: 100%;
      }

      .perfil-selector-inline {
        min-width: unset;
      }

      .filter-count {
        text-align: right;
        margin-top: var(--spacing-sm, 8px);
      }
    }
  `],
})
export class DocumentosFiltersComponent {
  @Input() selectedPerfilId: number | null = null;
  @Input() search = '';
  @Input() loading = false;
  @Input() filteredCount = 0;

  @Output() perfilChange = new EventEmitter<number | null>();
  @Output() perfilObjChange = new EventEmitter<Perfil | null>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();
}
