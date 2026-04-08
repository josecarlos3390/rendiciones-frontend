import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SourceBadgeComponent } from '../source-badge/source-badge.component';
import { FacturaResult } from '../../services/factura.service';

@Component({
  selector: 'app-ai-factura-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, SourceBadgeComponent],
  template: `
    <div class="preview-overlay" (click)="onOverlayClick($event)">
      <div class="preview-modal">
        <!-- Header -->
        <div class="preview-header">
          <h3>Vista Preliminar de Factura</h3>
          <button class="btn-close" (click)="onCancel()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Indicador de fuente -->
        <div class="preview-source" *ngIf="result">
          <app-source-badge 
            [source]="result.source" 
            [confidence]="result.confidence">
          </app-source-badge>
          
          <div class="source-info" *ngIf="result.source === 'ai_claude'">
            <span class="info-icon">ℹ️</span>
            <span class="info-text">
              Datos extraídos por inteligencia artificial. Verificá la información antes de confirmar.
            </span>
          </div>
        </div>

        <!-- Advertencias -->
        <div class="preview-warnings" *ngIf="result?.warnings && result!.warnings!.length > 0">
          <div class="warning-item" *ngFor="let warning of result!.warnings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>{{ warning }}</span>
          </div>
        </div>

        <!-- Error -->
        <div class="preview-error" *ngIf="result?.error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div>
            <strong>No se pudieron obtener los datos automáticamente</strong>
            <p>{{ result?.error }}</p>
          </div>
        </div>

        <!-- Formulario de edición -->
        <div class="preview-form" *ngIf="editableData">
          <div class="form-row">
            <label>NIT Emisor</label>
            <input 
              type="text" 
              [(ngModel)]="editableData.nit" 
              placeholder="Ej: 123456789"
              [class.has-error]="!editableData.nit">
          </div>

          <div class="form-row">
            <label>Razón Social</label>
            <input 
              type="text" 
              [(ngModel)]="editableData.razonSocial" 
              placeholder="Nombre del emisor"
              [class.has-error]="!editableData.razonSocial">
          </div>

          <div class="form-row">
            <label>N° Factura</label>
            <input 
              type="text" 
              [(ngModel)]="editableData.numeroFactura" 
              placeholder="Ej: 001-001-0001234">
          </div>

          <div class="form-row">
            <label>Fecha</label>
            <input 
              type="date" 
              [(ngModel)]="editableData.fecha"
              [class.has-error]="!editableData.fecha">
          </div>

          <div class="form-row">
            <label>Monto Total</label>
            <input 
              type="number" 
              [(ngModel)]="editableData.monto" 
              placeholder="0.00"
              step="0.01"
              [class.has-error]="!editableData.monto || editableData.monto <= 0">
          </div>

          <div class="form-row">
            <label>Concepto</label>
            <textarea 
              [(ngModel)]="editableData.concepto" 
              placeholder="Descripción del servicio o producto"
              rows="2">
            </textarea>
          </div>

          <div class="form-row">
            <label>CUF</label>
            <input 
              type="text" 
              [(ngModel)]="editableData.cuf" 
              placeholder="Código Único de Factura (opcional)">
          </div>
        </div>

        <!-- Footer con acciones -->
        <div class="preview-footer">
          <button class="btn-secondary" (click)="onCancel()">
            Cancelar
          </button>
          <button 
            class="btn-primary" 
            (click)="onConfirm()"
            [disabled]="!isValid()">
            Confirmar y Agregar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .preview-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
      animation: fade-in 0.2s ease;
    }

    .preview-modal {
      background: var(--bg-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-modal);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slide-up 0.2s ease;
    }

    /* Header */
    .preview-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .preview-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-heading);
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s;
    }

    .btn-close:hover {
      background: var(--bg-subtle);
      color: var(--text-heading);
    }

    /* Source indicator */
    .preview-source {
      padding: 12px 20px;
      background: var(--bg-faint);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .source-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .info-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    /* Warnings */
    .preview-warnings {
      padding: 12px 20px;
      background: rgba(245, 158, 11, 0.08);
      border-bottom: 1px solid rgba(245, 158, 11, 0.2);
    }

    .warning-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #b45309;
      padding: 4px 0;
    }

    .warning-item svg {
      flex-shrink: 0;
      color: #f59e0b;
    }

    /* Error */
    .preview-error {
      padding: 16px 20px;
      background: rgba(239, 68, 68, 0.08);
      border-bottom: 1px solid rgba(239, 68, 68, 0.2);
      display: flex;
      gap: 12px;
      color: #dc2626;
    }

    .preview-error svg {
      flex-shrink: 0;
    }

    .preview-error strong {
      display: block;
      font-size: 13px;
      margin-bottom: 4px;
    }

    .preview-error p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    /* Form */
    .preview-form {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
    }

    .form-row {
      margin-bottom: 12px;
    }

    .form-row label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-heading);
      margin-bottom: 4px;
    }

    .form-row input,
    .form-row textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 13px;
      background: var(--bg-surface);
      color: var(--text-body);
      transition: border-color 0.2s;
    }

    .form-row input:focus,
    .form-row textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-row input.has-error,
    .form-row textarea.has-error {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.04);
    }

    .form-row input::placeholder,
    .form-row textarea::placeholder {
      color: var(--text-faint);
    }

    .form-row textarea {
      resize: vertical;
      min-height: 60px;
      font-family: inherit;
    }

    /* Footer */
    .preview-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-faint);
    }

    .btn-secondary {
      padding: 8px 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-body);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: var(--bg-subtle);
    }

    .btn-primary {
      padding: 8px 16px;
      border: none;
      background: var(--color-primary, #667eea);
      border-radius: var(--radius-md, 8px);
      font-size: 13px;
      font-weight: 500;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-dark, #5a6fd6);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--color-primary, #667eea);
      transform: none;
      box-shadow: none;
    }

    /* Animations */
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slide-up {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Dark theme */
    :host-context([data-theme="dark"]) .preview-warnings {
      background: rgba(245, 158, 11, 0.12);
    }

    :host-context([data-theme="dark"]) .warning-item {
      color: #fbbf24;
    }

    :host-context([data-theme="dark"]) .preview-error {
      background: rgba(239, 68, 68, 0.12);
    }
  `]
})
export class AiFacturaPreviewComponent {
  @Input() result: FacturaResult | null = null;
  @Output() confirm = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  editableData: any = {};

  ngOnInit() {
    if (this.result?.data) {
      const data = this.result.data as any;
      // Inicializar datos editables (sin código de control)
      this.editableData = {
        nit: data.nit || '',
        razonSocial: data.companyName || data.razonSocial || '',
        numeroFactura: data.invoiceNumber || data.numeroFactura || '',
        fecha: data.datetime || data.fecha || '',
        monto: data.total || data.monto || 0,
        concepto: data.concepto || '',
        cuf: data.cuf || ''
      };
    }
  }

  onOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  onConfirm() {
    this.confirm.emit(this.editableData);
  }

  isValid(): boolean {
    return !!(
      this.editableData.nit &&
      this.editableData.razonSocial &&
      this.editableData.fecha &&
      this.editableData.monto &&
      this.editableData.monto > 0
    );
  }
}
