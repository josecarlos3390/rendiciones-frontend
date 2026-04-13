/**
 * PerfilSelectorComponent - Pantalla de selección de perfil (Paso 1)
 * 
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Permiso } from '@models/permiso.model';

@Component({
  selector: 'app-perfil-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-selector.component.html',
  styleUrls: ['./perfil-selector.component.scss'],
})
export class PerfilSelectorComponent {
  @Input() loading = false;
  @Input() permisos: Permiso[] = [];

  @Output() select = new EventEmitter<Permiso>();

  get hasPerfiles(): boolean {
    return this.permisos.length > 0;
  }

  onSelect(permiso: Permiso): void {
    this.select.emit(permiso);
  }

  getInitial(nombre: string): string {
    return nombre.charAt(0).toUpperCase();
  }
}
