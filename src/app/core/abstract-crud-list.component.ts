import { Directive, ChangeDetectorRef, inject } from '@angular/core';
import { CrudListStore } from './crud-list-store';
import { SelectOption } from '@shared/app-select/app-select.component';

/**
 * Clase base abstracta para componentes CRUD de listado.
 * Centraliza store, paginación, búsqueda y filtros de estado.
 */
@Directive()
export abstract class AbstractCrudListComponent<T> {
  abstract readonly store: CrudListStore<T>;

  filterActiva: 'todas' | 'activas' | 'inactivas' = 'todas';

  estadoOptions: SelectOption<'todas' | 'activas' | 'inactivas'>[] = [
    { value: 'todas', label: 'Todas', icon: '🔍' },
    { value: 'activas', label: 'Activas', icon: '✅' },
    { value: 'inactivas', label: 'Inactivas', icon: '⭕' },
  ];

  protected cdr = inject(ChangeDetectorRef);

  onPageChange(p: number): void {
    this.store.setPage(p);
  }

  onLimitChange(l: number): void {
    this.store.setLimit(l);
  }

  onSearchChange(value: string): void {
    this.store.setSearch(value);
  }

  onSearchCleared(): void {
    this.store.setSearch('');
  }

  onFilterActivaChange(value: string): void {
    this.filterActiva = value as 'todas' | 'activas' | 'inactivas';
    this._applyActivaFilter();
  }

  /**
   * Determina si un item está activo. Override en subclases que tengan
   * filtro de estado activo/inactivo. Default: true (sin filtro).
   */
  protected getActiva(_item: T): boolean {
    return true;
  }

  protected _applyActivaFilter(): void {
    if (this.filterActiva === 'activas') {
      this.store.setCustomFilter('activa', (item) => this.getActiva(item));
    } else if (this.filterActiva === 'inactivas') {
      this.store.setCustomFilter('activa', (item) => !this.getActiva(item));
    } else {
      this.store.setCustomFilter('activa', null);
    }
  }
}
