/**
 * RendicionFiltersComponent - Barra de filtros para rendiciones
 * 
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchInputComponent } from '@shared/debounce';

export type VerFiltro = 'propias' | 'subordinados' | 'todas';
export type EstadoFiltro = 'todas' | 'abiertas' | 'cerradas' | 'enviadas' | 'aprobadas' | 'sincronizadas' | 'error';

@Component({
  selector: 'app-rendicion-filters',
  standalone: true,
  imports: [CommonModule, SearchInputComponent],
  templateUrl: './rendicion-filters.component.html',
  styleUrls: ['./rendicion-filters.component.scss'],
})
export class RendicionFiltersComponent {
  @Input() verFiltro: VerFiltro = 'propias';
  @Input() estadoFiltro: EstadoFiltro = 'todas';
  @Input() search = '';
  @Input() totalPropias = 0;
  @Input() totalSubordinados = 0;
  @Input() loading = false;
  @Input() loadingSubordinados = false;
  @Input() esAprobador = false;
  @Input() sinAprobador = false;
  @Input() isAdmin = false;

  @Output() verFiltroChange = new EventEmitter<VerFiltro>();
  @Output() estadoFiltroChange = new EventEmitter<EstadoFiltro>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  get showVerFiltro(): boolean {
    return this.esAprobador || this.sinAprobador || this.isAdmin;
  }

  get totalCount(): number {
    if (this.verFiltro === 'propias') return this.totalPropias;
    if (this.verFiltro === 'subordinados') return this.totalSubordinados;
    return this.totalPropias + this.totalSubordinados;
  }

  get countLabel(): string {
    const count = this.totalCount;
    return count === 1 ? '1 rendición' : `${count} rendiciones`;
  }

  onVerFiltroChange(value: VerFiltro): void {
    this.verFiltroChange.emit(value);
  }

  onEstadoFiltroChange(value: EstadoFiltro): void {
    this.estadoFiltroChange.emit(value);
  }

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }
}
