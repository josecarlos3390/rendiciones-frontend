import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormModalComponent } from '../../../../../shared/form-modal';

export type InputMode = 'qr' | 'manual' | 'url' | 'pdf';

/**
 * Modal para seleccionar el modo de entrada de documentos
 * QR / Manual / URL / PDF
 */
@Component({
  selector: 'app-mode-selector-modal',
  standalone: true,
  imports: [CommonModule, FormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-modal
      [title]="'Agregar Documento'"
      [isOpen]="isOpen"
      [isEditing]="false"
      [submitDisabled]="true"
      (save)="onCancel()"
      (cancel)="onCancel()">
      
      <ng-template #formContent>
        <div class="mode-body">
          <p class="mode-subtitle">¿Cómo querés registrar el documento?</p>
          <div class="mode-options">

            <button class="mode-card" type="button" (click)="selectMode('qr')">
              <span class="mode-icon">📷</span>
              <span class="mode-label">Registrar por QR</span>
              <span class="mode-desc">Escaneá el código QR de la factura con la cámara</span>
            </button>

            <button class="mode-card" type="button" (click)="selectMode('manual')">
              <span class="mode-icon">✏️</span>
              <span class="mode-label">Registro Manual</span>
              <span class="mode-desc">Completá los datos del documento manualmente</span>
            </button>

            <button class="mode-card" type="button" (click)="selectMode('url')">
              <span class="mode-icon">🔗</span>
              <span class="mode-label">Registrar por URL</span>
              <span class="mode-desc">Pegá el enlace de la factura electrónica</span>
            </button>

            <button class="mode-card" type="button" (click)="selectMode('pdf')">
              <span class="mode-icon">📄</span>
              <span class="mode-label">Registrar por PDF</span>
              <span class="mode-desc">Subí el archivo PDF de tu factura</span>
            </button>

          </div>
        </div>
      </ng-template>
      
      <ng-template #formFooter>
        <button type="button" class="btn btn-ghost" (click)="onCancel()">Cancelar</button>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    .mode-body {
      padding: 8px;
    }

    .mode-subtitle {
      text-align: center;
      color: var(--text-muted, #6b7280);
      margin-bottom: 20px;
      font-size: 14px;
    }

    .mode-options {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .mode-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px 16px;
      background: var(--bg-secondary, #f9fafb);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .mode-card:hover {
      background: var(--bg-primary, #ffffff);
      border-color: var(--primary-color, #6366f1);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .mode-icon {
      font-size: 32px;
      line-height: 1;
    }

    .mode-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary, #111827);
    }

    .mode-desc {
      font-size: 12px;
      color: var(--text-muted, #6b7280);
      text-align: center;
      line-height: 1.4;
    }

    @media (max-width: 480px) {
      .mode-options {
        grid-template-columns: 1fr;
      }
    }

    :host-context([data-theme="dark"]) .mode-card {
      background: var(--bg-secondary-dark, #374151);
    }

    :host-context([data-theme="dark"]) .mode-card:hover {
      background: var(--bg-card-dark, #1f2937);
    }

    :host-context([data-theme="dark"]) .mode-label {
      color: var(--text-primary-dark, #f9fafb);
    }
  `],
})
export class ModeSelectorModalComponent {
  @Input() isOpen = false;
  @Output() modeSelect = new EventEmitter<InputMode>();
  @Output() cancel = new EventEmitter<void>();

  selectMode(mode: InputMode): void {
    this.modeSelect.emit(mode);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
