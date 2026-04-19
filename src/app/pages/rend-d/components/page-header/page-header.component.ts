/**
 * PageHeaderComponent - Header de la página de detalle de rendición
 *
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RendM } from '@models/rend-m.model';
import { CrudPageHeaderComponent } from '@shared/crud-page-header';
import {
  ICON_ARROW_LEFT,
  ICON_UPLOAD,
  ICON_DOWNLOAD,
  ICON_FILE,
  ICON_PRINT,
} from '@common/constants/icons';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, CrudPageHeaderComponent],
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

  private sanitizer = inject(DomSanitizer);

  readonly iconArrowLeft: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(ICON_ARROW_LEFT);
  readonly iconUpload:   SafeHtml = this.sanitizer.bypassSecurityTrustHtml(ICON_UPLOAD);
  readonly iconDownload: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(ICON_DOWNLOAD);
  readonly iconFile:     SafeHtml = this.sanitizer.bypassSecurityTrustHtml(ICON_FILE);
  readonly iconPrint:    SafeHtml = this.sanitizer.bypassSecurityTrustHtml(ICON_PRINT);

  onImportarFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importar.emit(input.files[0]);
    }
  }
}
