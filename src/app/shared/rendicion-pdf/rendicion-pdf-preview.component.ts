import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RendM } from '../../models/rend-m.model';
import { RendD } from '../../models/rend-d.model';
import { Documento } from '../../models/documento.model';
import { RendicionPdfService } from './rendicion-pdf.service';

@Component({
  selector: 'app-rendicion-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="modal-backdrop pdf-preview-backdrop" (click)="onBackdrop($event)">
  <div class="modal-card modal-card--pdf" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

    <!-- Header -->
    <div class="modal-header pdf-preview-header">
      <div class="pdf-header-info">
        <h3 class="pdf-title">
          {{ mode === 'reprint' ? '🖨 Reimprimir' : '📄 Vista previa' }}
          — Rendición N° {{ rend.U_IdRendicion }}
        </h3>
        <span class="pdf-subtitle">{{ rend.U_Objetivo }}</span>
      </div>
      <div class="pdf-header-actions">
        <button type="button" class="btn btn-ghost btn-sm btn-icon-mobile" 
          [class.active]="pdfOrientation === 'portrait'"
          (click)="pdfOrientation = 'portrait'"
          title="Vista vertical">
          <span class="btn-icon">📄</span>
          <span class="btn-text">Vertical</span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-icon-mobile"
          [class.active]="pdfOrientation === 'landscape'"
          (click)="pdfOrientation = 'landscape'"
          title="Vista horizontal">
          <span class="btn-icon">📑</span>
          <span class="btn-text">Horizontal</span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-icon-mobile" (click)="descargar()" [disabled]="generating" title="Descargar PDF">
          <span class="btn-icon">⬇</span>
          <span class="btn-text">Descargar</span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-icon-mobile" (click)="abrirNuevaVentana()" [disabled]="generating" title="Abrir en nueva pestaña para imprimir">
          <span class="btn-icon">🖨</span>
          <span class="btn-text">Imprimir</span>
        </button>
        <button type="button" class="modal-close" (click)="cerrar()" title="Cerrar">✕</button>
      </div>
    </div>

    <!-- Cuerpo -->
    <div class="modal-body pdf-preview-body">

      <!-- Generando -->
      <div class="pdf-loading" *ngIf="generating">
        <div class="pdf-spinner"></div>
        <span>Generando documento...</span>
      </div>

      <!-- Error -->
      <div class="pdf-error" *ngIf="!generating && error">
        <span class="error-icon">⚠</span>
        <span>{{ error }}</span>
        <button class="btn btn-ghost btn-sm" (click)="reintentar()">↺ Reintentar</button>
      </div>

      <!-- Vista previa con objeto embed (más compatible que iframe para blob) -->
      <div class="pdf-preview-wrap" *ngIf="!generating && !error && safeUrl">
        <object
          [data]="safeUrl"
          type="application/pdf"
          class="pdf-object">
          <!-- Fallback si el navegador no puede mostrar el PDF inline -->
          <div class="pdf-fallback">
            <div class="fallback-icon">📄</div>
            <p>Tu navegador no puede mostrar el PDF aquí.</p>
            <p>Usá los botones de arriba para <strong>Descargar</strong> o <strong>Imprimir</strong>.</p>
            <button class="btn btn-primary" (click)="descargar()">⬇ Descargar PDF</button>
          </div>
        </object>
      </div>

    </div>

    <!-- Footer -->
    <div class="modal-footer pdf-preview-footer">
      <span class="pdf-footer-note" *ngIf="mode !== 'reprint'">
        ℹ️ Descargá o imprimí el comprobante antes de confirmar el envío
      </span>
      <span class="pdf-footer-note" *ngIf="mode === 'reprint'">
        ℹ️ Podés descargar o imprimir este comprobante cuando quieras
      </span>
      <div class="pdf-footer-btns">
        <button type="button" class="btn btn-ghost" (click)="cerrar()" [disabled]="confirming">
          {{ mode === 'reprint' ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button type="button"
          *ngIf="mode !== 'reprint'"
          class="btn btn-primary"
          (click)="confirmar()"
          [disabled]="generating || confirming">
          <span *ngIf="confirming">Enviando...</span>
          <span *ngIf="!confirming">✉️ Confirmar y Enviar</span>
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
/* ── Backdrop ── */
.pdf-preview-backdrop {
  /* Extiende el patrón .modal-backdrop con ajustes específicos */
  z-index: 1100;
  background: rgba(0, 0, 0, 0.65);
  padding: 16px;
}

/* ── Modal ── */
.modal-card--pdf {
  max-width: 920px;
  width: 100%;
  height: min(92vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.pdf-preview-header {
  /* Extiende .modal-header con ajustes específicos */
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 16px;
  background: var(--bg-faint);
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
}

.pdf-header-info {
  display: flex; 
  flex-direction: column; 
  gap: 4px; 
  min-width: 0;
  flex: 1;
}

.pdf-title {
  font-size: 16px;
  font-weight: var(--weight-semibold);
  color: var(--text-heading);
  margin: 0;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
}

.pdf-subtitle {
  font-size: 13px; 
  color: var(--text-muted);
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis;
}

.pdf-header-actions {
  display: flex; 
  align-items: center; 
  gap: 8px; 
  flex-shrink: 0;
}

.btn-icon-mobile {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  
  .btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    line-height: 1;
    width: 18px;
    height: 18px;
  }
  
  .btn-text {
    display: inline;
    line-height: 1;
  }
  
  /* Estado activo */
  &.active {
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border-color: var(--color-primary);
  }
}

/* ── Body ── */
.pdf-preview-body {
  /* Extiende .modal-body con ajustes específicos para PDF */
  flex: 1;
  padding: 0;
  min-height: 0;
  position: relative;
  background: #525659; /* Fondo PDF viewer - se mantiene fijo */
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}

.pdf-loading, .pdf-error {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
  color: var(--text-body);
  font-size: 14px;
  padding: 32px;
  text-align: center;
}

.error-icon { font-size: 32px; }

.pdf-spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.pdf-preview-wrap {
  width: 100%; height: 100%;
  display: flex; align-items: stretch;
}

.pdf-object {
  width: 100%; height: 100%;
  display: block; border: none;
}

.pdf-fallback {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px;
  color: var(--text-heading);
  padding: 40px;
  text-align: center;
  background: var(--bg-surface);
  width: 100%;
}

.fallback-icon { font-size: 48px; }

/* ── Footer ── */
.pdf-preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  background: var(--bg-faint);
  padding: 14px 18px;
  border-top: 1px solid var(--border-color);
}

.pdf-footer-note {
  font-size: 12px; 
  color: var(--text-muted);
  flex: 1;
  min-width: 0;
}

.pdf-footer-btns { 
  display: flex; 
  align-items: center;
  gap: 10px; 
  flex-shrink: 0;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .pdf-preview-backdrop {
    padding: 0;
    align-items: flex-end;
  }
  
  .modal-card--pdf {
    max-width: 100%;
    width: 100%;
    height: 95vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }
  
  .pdf-preview-header {
    flex-direction: column;
    align-items: stretch;
    padding: 20px 16px 12px;
    padding-top: calc(24px + env(safe-area-inset-top));
    gap: 12px;
  }
  
  .pdf-header-actions {
    flex-wrap: nowrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 0 8px;
  }
  
  .btn-icon-mobile {
    padding: 0;
    width: 44px;
    height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    .btn-text {
      display: none; /* Ocultar texto en móvil, mostrar solo ícono */
    }
    
    .btn-icon {
      font-size: 20px;
      line-height: 1;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .pdf-title {
    font-size: 14px;
    text-align: center;
    width: 100%;
  }
  
  .pdf-subtitle {
    text-align: center;
    width: 100%;
  }
  
  .pdf-header-info {
    width: 100%;
    align-items: center;
  }
  
  .pdf-preview-footer { 
    flex-direction: column; 
    align-items: stretch;
    padding: 12px 16px;
    gap: 10px;
  }
  
  .pdf-footer-btns { 
    justify-content: flex-end;
    width: 100%;
    gap: 8px;
    order: -1; /* Botones arriba en móvil */
    
    .btn {
      padding: 10px 16px;
      font-size: 14px;
      flex: 1;
    }
  }
  
  .pdf-footer-note {
    text-align: center;
    font-size: 11px;
    order: 1;
  }
}
  `],
})
export class RendicionPdfPreviewComponent implements OnInit, OnDestroy, OnChanges {
  @Input()  rend!: RendM;
  @Input()  docs:  RendD[] = [];
  @Input()  tiposDocs: Documento[] = [];
  @Input()  mode:  'envio' | 'reprint' = 'envio';
  @Input()  orientation: 'portrait' | 'landscape' = 'portrait';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();

  get pdfOrientation(): 'portrait' | 'landscape' { return this.orientation; }
  set pdfOrientation(v: 'portrait' | 'landscape') { 
    this.orientation = v; 
    this.generarPdf(); 
  }

  generating = true;
  confirming = false;
  error: string | null = null;

  safeUrl:    SafeResourceUrl | null = null;
  private blob:      Blob   | null = null;
  private objectUrl: string | null = null;

  constructor(
    private pdfSvc:    RendicionPdfService,
    private sanitizer: DomSanitizer,
    private cdr:       ChangeDetectorRef,
  ) {}

  ngOnInit() { this.generarPdf(); }

  ngOnChanges() { 
    if (this.docs && this.docs.length > 0 && this.rend) {
      this.generarPdf();
    }
  }

  ngOnDestroy() { this._revokeUrl(); }

  private _revokeUrl() {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private async generarPdf() {
    this.generating = true;
    this.error      = null;
    this.safeUrl    = null;
    this.cdr.markForCheck();

    try {
      const result   = await this.pdfSvc.generarPDF(this.rend, this.docs, this.orientation, this.tiposDocs);
      this.blob      = result.blob;
      this._revokeUrl();
      this.objectUrl = result.url;
      // Bypass security — es una URL blob generada internamente, nunca viene del usuario
      this.safeUrl   = this.sanitizer.bypassSecurityTrustResourceUrl(result.url);
      this.generating = false;
    } catch (err: any) {
      this.error      = err?.message ?? 'Error al generar el PDF';
      this.generating = false;
    }
    this.cdr.markForCheck();
  }

  reintentar()          { this.generarPdf(); }

  descargar()           { if (this.blob) this.pdfSvc.descargar(this.blob, this.rend); }

  abrirNuevaVentana()   {
    if (this.objectUrl) window.open(this.objectUrl, '_blank');
  }

  confirmar() {
    if (this.confirming) return;
    this.confirming = true;
    this.cdr.markForCheck();
    this.confirm.emit();
  }

  cerrar()              { this.cancel.emit(); }

  onBackdrop(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('pdf-backdrop')) this.cerrar();
  }
}