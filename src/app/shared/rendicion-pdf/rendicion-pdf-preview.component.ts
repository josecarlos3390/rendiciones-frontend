import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RendM } from '../../models/rend-m.model';
import { RendD } from '../../models/rend-d.model';
import { RendicionPdfService } from './rendicion-pdf.service';

@Component({
  selector: 'app-rendicion-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="pdf-backdrop" (click)="onBackdrop($event)">
  <div class="pdf-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

    <!-- Header -->
    <div class="pdf-header">
      <div class="pdf-header-info">
        <h3 class="pdf-title">
          {{ mode === 'reprint' ? '🖨 Reimprimir' : '📄 Vista previa' }}
          — Rendición N° {{ rend.U_IdRendicion }}
        </h3>
        <span class="pdf-subtitle">{{ rend.U_Objetivo }}</span>
      </div>
      <div class="pdf-header-actions">
        <button class="btn btn-ghost btn-sm" (click)="descargar()" [disabled]="generating" title="Descargar PDF">
          ⬇ Descargar
        </button>
        <button class="btn btn-ghost btn-sm" (click)="abrirNuevaVentana()" [disabled]="generating" title="Abrir en nueva pestaña para imprimir">
          🖨 Imprimir
        </button>
        <button class="pdf-close" (click)="cerrar()">✕</button>
      </div>
    </div>

    <!-- Cuerpo -->
    <div class="pdf-body">

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
    <div class="pdf-footer">
      <span class="pdf-footer-note" *ngIf="mode !== 'reprint'">
        ℹ Descargá o imprimí el comprobante antes de confirmar el envío
      </span>
      <span class="pdf-footer-note" *ngIf="mode === 'reprint'">
        ℹ Podés descargar o imprimir este comprobante cuando quieras
      </span>
      <div class="pdf-footer-btns">
        <button class="btn btn-ghost" (click)="cerrar()" [disabled]="confirming">
          {{ mode === 'reprint' ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button
          *ngIf="mode !== 'reprint'"
          class="btn btn-primary"
          (click)="confirmar()"
          [disabled]="generating || confirming">
          <span *ngIf="confirming">Enviando...</span>
          <span *ngIf="!confirming">✉ Confirmar y Enviar</span>
        </button>
      </div>
    </div>

  </div>
</div>
  `,
  styles: [`
.pdf-backdrop {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}

.pdf-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 25px 60px rgba(0,0,0,.4);
  width: min(920px, 96vw);
  height: min(92vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Header ── */
.pdf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border);
  gap: 12px;
  flex-shrink: 0;
  background: var(--color-surface);
}

.pdf-header-info {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}

.pdf-title {
  font-size: 15px;
  font-weight: var(--weight-semibold);
  color: var(--color-text);
  margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.pdf-subtitle {
  font-size: 12px; color: var(--color-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.pdf-header-actions {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}

.pdf-close {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 18px; padding: 4px 8px;
  border-radius: var(--radius-sm); line-height: 1;
  &:hover { background: var(--color-hover); }
}

/* ── Body ── */
.pdf-body {
  flex: 1; min-height: 0; position: relative;
  background: #525659;   /* gris neutro típico de visores PDF */
  display: flex; align-items: center; justify-content: center;
}

.pdf-loading, .pdf-error {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
  color: #e2e8f0;
  font-size: 14px;
  padding: 32px;
  text-align: center;
}

.error-icon { font-size: 32px; }

.pdf-spinner {
  width: 36px; height: 36px;
  border: 3px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* object tag cubre todo el body */
.pdf-preview-wrap {
  width: 100%; height: 100%;
  display: flex; align-items: stretch;
}

.pdf-object {
  width: 100%; height: 100%;
  display: block; border: none;
}

/* Fallback cuando el objeto no renderiza */
.pdf-fallback {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px;
  color: var(--color-text);
  padding: 40px;
  text-align: center;
  background: var(--color-surface);
  width: 100%;
}

.fallback-icon { font-size: 48px; }

/* ── Footer ── */
.pdf-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid var(--color-border);
  gap: 12px; flex-shrink: 0;
  background: var(--color-surface);
}

.pdf-footer-note {
  font-size: 12px; color: var(--color-text-secondary);
}

.pdf-footer-btns { display: flex; gap: 10px; }

@media (max-width: 640px) {
  .pdf-footer { flex-direction: column; align-items: stretch; }
  .pdf-footer-btns { justify-content: flex-end; }
  .pdf-header { flex-wrap: wrap; }
}
  `],
})
export class RendicionPdfPreviewComponent implements OnInit, OnDestroy {
  @Input()  rend!: RendM;
  @Input()  docs:  RendD[] = [];
  @Input()  mode:  'envio' | 'reprint' = 'envio';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();

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
      const result   = await this.pdfSvc.generarPDF(this.rend, this.docs);
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