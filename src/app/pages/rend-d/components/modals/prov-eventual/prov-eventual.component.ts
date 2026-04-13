import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormModalComponent } from '../../../../../shared/form-modal';

/**
 * Modal para registrar un proveedor eventual
 */
@Component({
  selector: 'app-prov-eventual-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, FormModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-form-modal
      [title]="'Registrar Proveedor Eventual'"
      [isOpen]="isOpen"
      [loading]="loading"
      [isEditing]="false"
      [submitDisabled]="!nit.trim() || !nombre.trim() || loading"
      (save)="onConfirm()"
      (cancel)="onCancel()">
      
      <ng-template #formContent>
        <div class="prov-form">
          <div class="form-field">
            <label>NIT <span class="required">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="nit"
              placeholder="Número de identificación tributaria"
              [disabled]="loading"
              maxlength="255"
              autocomplete="off" />
          </div>

          <div class="form-field">
            <label>Razón Social <span class="required">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="nombre"
              placeholder="Nombre o razón social del proveedor"
              [disabled]="loading"
              maxlength="255"
              autocomplete="off" />
          </div>
        </div>
      </ng-template>
      
      <!-- Footer personalizado -->
      <ng-template #formFooter>
        <button type="button" class="btn btn-ghost" (click)="onCancel()" [disabled]="loading">
          Cancelar
        </button>
        <button type="button" class="btn btn-primary" (click)="onConfirm()" [disabled]="loading || !nit.trim() || !nombre.trim()">
          <span *ngIf="loading">Guardando...</span>
          <span *ngIf="!loading">Registrar Proveedor</span>
        </button>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    .prov-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-field label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #374151);
    }

    .form-field input {
      padding: 10px 12px;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px;
      font-size: 14px;
      background: var(--bg-primary, #ffffff);
      color: var(--text-primary, #111827);
    }

    .form-field input:focus {
      outline: none;
      border-color: var(--primary-color, #6366f1);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .form-field input:disabled {
      background: var(--bg-secondary, #f3f4f6);
      cursor: not-allowed;
    }

    .required {
      color: var(--danger-color, #ef4444);
    }

    :host-context([data-theme="dark"]) .form-field input {
      background: var(--bg-card-dark, #1f2937);
      border-color: var(--border-color-dark, #4b5563);
      color: var(--text-primary-dark, #f9fafb);
    }
  `],
})
export class ProvEventualModalComponent {
  @Input() isOpen = false;
  @Input() loading = false;
  
  @Output() confirm = new EventEmitter<{ nit: string; nombre: string }>();
  @Output() cancel = new EventEmitter<void>();

  nit = '';
  nombre = '';

  onConfirm(): void {
    if (this.nit.trim() && this.nombre.trim()) {
      this.confirm.emit({
        nit: this.nit.trim(),
        nombre: this.nombre.trim(),
      });
      this.reset();
    }
  }

  onCancel(): void {
    this.reset();
    this.cancel.emit();
  }

  private reset(): void {
    this.nit = '';
    this.nombre = '';
  }
}
