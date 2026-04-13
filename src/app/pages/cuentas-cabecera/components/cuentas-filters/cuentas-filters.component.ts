import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilSelectComponent } from '@shared/perfil-select/perfil-select.component';
import { SearchInputComponent } from '@shared/debounce/search-input.component';
import { Perfil } from '@models/perfil.model';

@Component({
  selector: 'app-cuentas-filters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PerfilSelectComponent,
    SearchInputComponent,
  ],
  templateUrl: './cuentas-filters.component.html',
  styleUrls: ['./cuentas-filters.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasFiltersComponent {
  @Input({ required: true }) selectedPerfilId: number | null = null;
  @Input({ required: true }) search = '';
  @Input({ required: true }) showSearch = false;
  @Input({ required: true }) filteredCount = 0;
  @Input({ required: true }) loading = false;

  @Output() perfilChange = new EventEmitter<number | null>();
  @Output() perfilObjChange = new EventEmitter<Perfil | null>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  onPerfilChange(id: number | null): void {
    this.perfilChange.emit(id);
  }

  onPerfilObjChange(perfil: Perfil | null): void {
    this.perfilObjChange.emit(perfil);
  }

  onSearchChange(value: string): void {
    this.searchChange.emit(value);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }
}
