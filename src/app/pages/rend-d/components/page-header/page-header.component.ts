/**
 * PageHeaderComponent - Header de la página de detalle de rendición
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RendM } from '@models/rend-m.model';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent {
  @Input() cabecera: RendM | null = null;
  @Input() isReadonly = false;
  @Input() documentosCount = 0;
  @Input() importando = false;

  @Output() back = new EventEmitter<void>();
  @Output() importar = new EventEmitter<File>();
  @Output() exportar = new EventEmitter<void>();
  @Output() formato = new EventEmitter<void>();
  @Output() imprimir = new EventEmitter<void>();
  @Output() adicionar = new EventEmitter<void>();

  onImportarFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importar.emit(input.files[0]);
    }
  }
}
