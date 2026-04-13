import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormModalComponent } from '../../../../../shared/form-modal';

/**
 * Modal para importar factura desde URL del SIAT
 */
@Component({
  selector: 'app-url-import-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-modal
      [title]="'Registrar por URL'"
      [isOpen]="isOpen"
      [loading]="loading"
      [isEditing]="false"
      [submitDisabled]="!url.trim() || loading"
      (save)="onConfirm()"
      (cancel)="onCancel()">
      
      <ng-template #formContent>
        <!-- Cargando SIAT -->
        <div class="qr-loading" *ngIf="loading">
          <div class="qr-loading-spinner"></div>
          <p class="qr-loading-text">Consultando SIAT...</p>
          <p class="qr-loading-sub">Obteniendo datos de la factura</p>
        </div>

        <!-- Formulario -->
        <ng-container *ngIf="!loading">
          <p class="mode-subtitle">Pegá el enlace de la factura electrónica del SIAT</p>

          <div class="qr-error" *ngIf="error" style="margin-bottom:12px">
            <span class="qr-error-icon">⚠️</span>
            <p>{{ error }}</p>
          </div>

          <div class="url-input-wrap">
            <input
              class="url-input"
              type="url"
              placeholder="https://siat.impuestos.gob.bo/consulta/QR?nit=..."
              [(ngModel)]="url"
              autocomplete="off"
              (keydown.enter)="onConfirm()" />
          </div>
        </ng-container>
      </ng-template>
      
      <!-- Footer personalizado para corregir el texto del botón -->
      <ng-template #formFooter>
        <button type="button" class="btn btn-ghost" (click)="onCancel()" [disabled]="loading">
          Cancelar
        </button>
        <button type="button" class="btn btn-primary" (click)="onConfirm()" [disabled]="loading || !url.trim()">
          <span *ngIf="loading">Consultando...</span>
          <span *ngIf="!loading">Consultar Factura</span>
        </button>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    .mode-subtitle {
      text-align: center;
      color: var(--text-muted, #6b7280);
      margin-bottom: 20px;
      font-size: 14px;
    }

    .qr-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px;
      gap: 12px;
    }

    .qr-loading-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid var(--border-color, #e5e7eb);
      border-top-color: var(--primary-color, #6366f1);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .qr-loading-text {
      font-size: 16px;
      font-weight: 500;
      color: var(--text-primary, #111827);
    }

    .qr-loading-sub {
      font-size: 13px;
      color: var(--text-muted, #6b7280);
    }

    .qr-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--danger-bg, #fef2f2);
      border: 1px solid var(--danger-border, #fecaca);
      border-radius: 8px;
      color: var(--danger-text, #dc2626);
      font-size: 13px;
    }

    .url-input-wrap {
      position: relative;
    }

    .url-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-primary, #ffffff);
      color: var(--text-primary, #111827);
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .url-input:focus {
      outline: none;
      border-color: var(--primary-color, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    :host-context([data-theme="dark"]) .url-input {
      background: var(--bg-card-dark, #1f2937);
      border-color: var(--border-color-dark, #4b5563);
      color: var(--text-primary-dark, #f9fafb);
    }

    :host-context([data-theme="dark"]) .qr-error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }
  `],
})
export class UrlImportModalComponent {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  url = '';

  onConfirm(): void {
    if (this.url.trim() && !this.loading) {
      this.confirm.emit(this.url.trim());
    }
  }

  onCancel(): void {
    this.url = '';
    this.cancel.emit();
  }
}
