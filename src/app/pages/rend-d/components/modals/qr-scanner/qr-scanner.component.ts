/**
 * QrScannerComponent - Modal de escaneo de códigos QR
 * 
 * Usa la librería qr-scanner para escanear códigos QR desde la cámara.
 * Componente dumb: recibe datos vía @Input(), emite eventos vía @Output()
 */

import { Component, Input, Output, EventEmitter, ElementRef, AfterViewInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import type QrScanner from 'qr-scanner';

@Component({
  selector: 'app-qr-scanner-modal',
  standalone: true,
  imports: [CommonModule, FormModalComponent],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScannerModalComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() scanning = false;
  @Input() error: string | null = null; // Error desde el padre (API/Servicio)

  @Output() scan = new EventEmitter<string>(); // Emite la URL del QR escaneado
  @Output() retry = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  cameraError: string | null = null;
  cameraReady = false;
  isInitializing = false;
  
  private qrScanner: QrScanner | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | undefined;
  private checkInterval: ReturnType<typeof setInterval> | undefined;
  private readonly CHECK_INTERVAL_MS = 100;
  private readonly MAX_CHECK_ATTEMPTS = 50; // 5 segundos máximo
  private checkAttempts = 0;

  constructor(private cdr: ChangeDetectorRef, private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.startInitialization();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        this.cameraError = null;
        this.cameraReady = false;
        this.checkAttempts = 0;
        // Pequeño delay para que el modal se renderice
        setTimeout(() => this.startInitialization(), 100);
      } else {
        this.destroyScanner();
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // Retorna el error a mostrar (prioriza error del padre, luego error de cámara)
  get displayError(): string | null {
    return this.error || this.cameraError;
  }

  private cleanup(): void {
    this.destroyScanner();
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private startInitialization(): void {
    if (this.isInitializing || !this.isOpen) return;
    
    console.log('[QR Scanner] Iniciando búsqueda de video element...');
    this.isInitializing = true;
    this.cdr.markForCheck();

    // Usar intervalo para verificar cuando el video element esté disponible
    this.checkInterval = setInterval(() => {
      this.checkAttempts++;
      
      const videoEl = this.getVideoElement();
      
      if (videoEl) {
        // Video element encontrado, proceder con inicialización
        console.log(`[QR Scanner] Video element encontrado en intento ${this.checkAttempts}`);
        clearInterval(this.checkInterval!);
        this.checkInterval = undefined;
        this.initScanner(videoEl);
      } else if (this.checkAttempts >= this.MAX_CHECK_ATTEMPTS) {
        // Timeout - no se encontró el video element
        clearInterval(this.checkInterval!);
        this.checkInterval = undefined;
        this.isInitializing = false;
        console.error('[QR Scanner] Timeout: no se encontró el video element después de 5 segundos');
        this.setCameraError('No se pudo inicializar la cámara. Intentá de nuevo.');
      }
    }, this.CHECK_INTERVAL_MS);
  }

  private getVideoElement(): HTMLVideoElement | null {
    // Buscar el elemento video dentro de este componente
    const nativeEl = this.elementRef.nativeElement as HTMLElement;
    const videoEl = nativeEl.querySelector('video');
    return videoEl as HTMLVideoElement | null;
  }

  private async initScanner(videoEl: HTMLVideoElement): Promise<void> {
    if (!this.isOpen) {
      this.isInitializing = false;
      return;
    }
    
    // Si ya hay un error del padre, no intentar iniciar cámara
    if (this.error) {
      this.isInitializing = false;
      return;
    }

    console.log('[QR Scanner] Inicializando escáner con video element...');

    try {
      this.cameraError = null;
      this.cdr.markForCheck();

      // Dynamic import para compatibilidad SSR
      const { default: QrScannerLib } = await import('qr-scanner');

      // Crear instancia de QrScanner
      this.qrScanner = new QrScannerLib(
        videoEl,
        (result: QrScanner.ScanResult) => {
          const url = result?.data;
          if (url) {
            this.onQrDetected(url);
          }
        },
        {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      // Iniciar el escáner
      await this.qrScanner.start();
      console.log('[QR Scanner] ✓ Escáner iniciado exitosamente');
      this.cameraReady = true;
      this.isInitializing = false;
      this.checkAttempts = 0;
      this.cdr.markForCheck();

    } catch (err: unknown) {
      console.error('[QR Scanner] Error iniciando escáner:', err);
      this.isInitializing = false;
      this.handleCameraError(err);
    }
  }

  private onQrDetected(url: string): void {
    console.log('[QR Scanner] QR detectado:', url.substring(0, 50) + '...');
    // Pausar el escáner para evitar múltiples lecturas
    this.qrScanner?.pause();
    // Emitir el resultado
    this.scan.emit(url);
  }

  private handleCameraError(err: unknown): void {
    let message: string;

    // QrScanner envuelve los errores, verificamos el mensaje
    const errorMsg = (err && typeof err === 'object' ? (err as Error).message : undefined) || String(err);
    
    if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowed')) {
      message = 'Permiso de cámara denegado. Permití el acceso en la barra de direcciones del navegador.';
    } else if (errorMsg.includes('NotFound') || errorMsg.includes('No camera')) {
      message = 'No se encontró cámara. Conectá una cámara o usá el registro manual.';
    } else if (errorMsg.includes('in use') || errorMsg.includes('NotReadable')) {
      message = 'La cámara está siendo usada por otra aplicación. Cerrá otras pestañas o apps.';
    } else {
      message = 'Error al acceder a la cámara. Verificá los permisos o usá el registro manual.';
    }
    
    this.setCameraError(message);
  }

  private setCameraError(message: string): void {
    this.cameraError = message;
    this.cameraReady = false;
    this.isInitializing = false;
    this.cdr.markForCheck();
  }

  private destroyScanner(): void {
    if (this.qrScanner) {
      this.qrScanner.stop();
      this.qrScanner.destroy();
      this.qrScanner = null;
    }
    this.cameraReady = false;
    this.isInitializing = false;
    this.checkAttempts = 0;
  }

  onRetry(): void {
    // Limpiar errores
    this.cameraError = null;
    this.cameraReady = false;
    this.checkAttempts = 0;
    
    // Si hay error del padre, emitir retry para que el padre lo limpie
    if (this.error) {
      this.retry.emit();
    }
    
    this.cdr.markForCheck();
    
    // Destruir y reiniciar
    this.cleanup();
    this.startInitialization();
  }

  onCancel(): void {
    this.cleanup();
    this.cancel.emit();
  }
}
