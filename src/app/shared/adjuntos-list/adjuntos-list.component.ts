import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AdjuntosService } from '../../services/adjuntos.service';
import { ToastService } from '../../core/toast/toast.service';
import { ConfirmDialogService } from '../../core/confirm-dialog/confirm-dialog.service';
import {
  Adjunto,
  formatFileSize,
  getFileIcon,
  isPreviewable,
} from '../../models/adjunto.model';

@Component({
  selector: 'app-adjuntos-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adjuntos-list.component.html',
  styleUrls: ['./adjuntos-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdjuntosListComponent {
  @Input() idRendicion!: number;
  @Input() idRD!: number;
  @Input() adjuntos: Adjunto[] = [];
  @Input() canEdit = true;
  @Output() adjuntoEliminado = new EventEmitter<number>();
  @Output() adjuntoSubido = new EventEmitter<Adjunto>();

  uploading = false;
  uploadProgress = 0;
  previewUrl: SafeResourceUrl | null = null;
  previewNombre: string | null = null;
  previewTipo: string | null = null;
  private objectUrl: string | null = null;

  constructor(
    private adjuntosService: AdjuntosService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private confirm: ConfirmDialogService,
  ) {}

  getFileIcon = getFileIcon;
  formatFileSize = formatFileSize;
  isPreviewable = isPreviewable;

  /**
   * Maneja la selección de archivo
   */
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
      input.value = ''; // Reset input
    }
  }

  /**
   * Maneja drop de archivos
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.uploadFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Sube el archivo
   */
  private uploadFile(file: File) {
    // Validar tamaño (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toast.error(`El archivo es demasiado grande. Máximo 10MB.`);
      return;
    }

    // Validar tipo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      this.toast.error(`Tipo de archivo no permitido. Solo PDF, imágenes, Word y Excel.`);
      return;
    }

    this.uploading = true;
    this.cdr.markForCheck();

    this.adjuntosService
      .uploadAdjunto(this.idRendicion, this.idRD, file)
      .subscribe({
        next: (adjunto) => {
          this.uploading = false;
          this.adjuntoSubido.emit(adjunto);
          this.toast.exito(`Archivo "${adjunto.nombre}" subido exitosamente`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uploading = false;
          const msg = err?.error?.message || 'Error al subir archivo';
          this.toast.error(msg);
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Descarga un archivo
   */
  descargar(adjunto: Adjunto) {
    this.adjuntosService.downloadAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = adjunto.nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.toast.error('Error al descargar archivo');
      },
    });
  }

  /**
   * Abre preview del archivo
   */
  verPreview(adjunto: Adjunto) {
    if (!this.isPreviewable(adjunto.tipo)) {
      this.descargar(adjunto);
      return;
    }

    this.adjuntosService.viewAdjunto(adjunto.id).subscribe({
      next: (blob) => {
        this._revokeUrl(); // Limpia URL anterior si existe
        this.objectUrl = window.URL.createObjectURL(blob);
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
        this.previewNombre = adjunto.nombre;
        this.previewTipo = adjunto.tipo;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error('Error al cargar vista previa');
      },
    });
  }

  /**
   * Descarga el archivo actual desde el preview
   */
  descargarDesdePreview() {
    if (this.previewNombre && this.previewTipo) {
      // Buscar el adjunto en la lista por nombre
      const adjunto = this.adjuntos.find(a => a.nombre === this.previewNombre);
      if (adjunto) {
        this.descargar(adjunto);
      }
    }
  }

  /**
   * Cierra el preview
   */
  cerrarPreview() {
    this._revokeUrl();
    this.previewUrl = null;
    this.previewNombre = null;
    this.previewTipo = null;
    this.cdr.markForCheck();
  }

  /**
   * Libera la URL del objeto blob
   */
  private _revokeUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  /**
   * Elimina un archivo
   */
  async eliminar(adjunto: Adjunto) {
    const confirmed = await this.confirm.ask({
      title: '¿Eliminar archivo?',
      message: `El archivo "${adjunto.nombre}" será eliminado permanentemente.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      type: 'danger',
    });

    if (!confirmed) {
      return;
    }

    this.adjuntosService.eliminarAdjunto(adjunto.id).subscribe({
      next: () => {
        this.adjuntoEliminado.emit(adjunto.id);
        this.toast.exito('Archivo eliminado');
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Error al eliminar archivo';
        this.toast.error(msg);
      },
    });
  }
}
