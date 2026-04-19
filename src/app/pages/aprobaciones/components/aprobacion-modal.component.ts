import {
  Component, Input, Output, EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AprobacionPendiente } from '@services/aprobaciones.service';
import { FormModalComponent } from '@shared/form-modal';
import { FormFieldComponent } from '@shared/form-field';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';

@Component({
  selector: 'app-aprobacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    FormModalComponent,
    FormFieldComponent,
    DdmmyyyyPipe,
  ],
  template: `
    <app-form-modal
      [title]="modalTitle"
      [subtitle]="rendicion ? 'N° ' + rendicion.U_IdRendicion : ''"
      [isOpen]="isOpen"
      [loading]="isSaving"
      [submitDisabled]="accion === 'rechazar' && !comentario.trim()"
      loadingText="Procesando..."
      (save)="onConfirmar()"
      (cancel)="onCancelar()">
      
      <ng-template #formContent>
        <div class="info-rows">
          <div class="info-row">
            <span class="info-label">Usuario</span>
            <span class="info-value">{{ rendicion?.U_NomUsuario }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Objetivo</span>
            <span class="info-value">{{ rendicion?.U_Objetivo }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Monto</span>
            <span class="info-value mono-cell">{{ rendicion?.U_Monto | number:'1.2-2' }} Bs</span>
          </div>
          <div class="info-row">
            <span class="info-label">Período</span>
            <span class="info-value">
              {{ rendicion?.U_FechaIni | ddmmyyyy }} ? {{ rendicion?.U_FechaFinal | ddmmyyyy }}
            </span>
          </div>
        </div>

        <div class="info-banner info-warning" *ngIf="accion === 'rechazar'">
          ? Al rechazar, la rendición volverá a estado <strong>ABIERTO</strong> para que el usuario realice correcciones y la reenvíe.
        </div>

        <app-form-field 
          label="Comentario"
          [required]="accion === 'rechazar'"
          [showOptional]="accion === 'aprobar'">
          <textarea
            [ngModel]="comentario"
            (ngModelChange)="onComentarioChange($event)"
            rows="3"
            maxlength="500"
            [placeholder]="accion === 'rechazar' ? 'Indicá el motivo del rechazo...' : 'Observaciones opcionales...'">
          </textarea>
          <span class="field-error" *ngIf="accion === 'rechazar' && !comentario.trim()">
            El motivo de rechazo es obligatorio
          </span>
        </app-form-field>
      </ng-template>

      <ng-template #formFooter>
        <button class="btn btn-ghost" type="button" (click)="onCancelar()" [disabled]="isSaving">Cancelar</button>
        <button
          [class]="accion === 'aprobar' ? 'btn btn-primary' : 'btn btn-danger-soft'"
          type="button"
          [disabled]="isSaving || (accion === 'rechazar' && !comentario.trim())"
          (click)="onConfirmar()">
          <span *ngIf="isSaving">Procesando...</span>
          <span *ngIf="!isSaving">{{ accion === 'aprobar' ? '? Confirmar Aprobación' : '? Confirmar Rechazo' }}</span>
        </button>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    :host { display: block; }

    .info-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: var(--bg-faint, #f8fafc);
      border-radius: var(--radius-md, 6px);
      padding: 12px 16px;
    }

    .info-row {
      display: flex;
      gap: 12px;
      align-items: baseline;
    }

    @media (max-width: 400px) {
      .info-row {
        flex-direction: column;
        gap: 2px;
      }
    }

    .info-label {
      font-size: var(--text-xs, 11px);
      font-weight: var(--weight-semibold, 600);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #64748b);
      min-width: 70px;
      flex-shrink: 0;
    }

    @media (max-width: 400px) {
      .info-label { min-width: unset; }
    }

    .info-value {
      font-size: var(--text-sm, 13px);
      color: var(--text-body, #334155);
      word-break: break-word;
    }

    .mono-cell {
      font-family: var(--font-mono, monospace);
    }

    .info-banner {
      margin: 0;
      padding: 12px 16px;
      border-radius: var(--radius-md, 6px);
      font-size: var(--text-sm, 13px);
      line-height: 1.5;
    }

    .info-warning {
      background: var(--color-warning-bg, #fef3c7);
      color: var(--color-warning-text, #92400e);
      border: 1px solid var(--color-warning-border, #fcd34d);
    }

    textarea {
      padding: 8px 12px;
      border: 1.5px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-md, 6px);
      background: var(--bg-surface, #ffffff);
      color: var(--text-body, #334155);
      font-family: inherit;
      font-size: var(--text-sm, 13px);
      width: 100%;
      resize: vertical;
    }

    textarea:focus-visible {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: var(--shadow-focus, 0 0 0 3px rgba(59, 130, 246, 0.15));
    }

    .field-error {
      display: block;
      color: var(--color-danger, #dc2626);
      font-size: var(--text-xs, 11px);
      margin-top: 4px;
    }
  `]
})
export class AprobacionModalComponent {
  @Input() isOpen = false;
  @Input() accion: 'aprobar' | 'rechazar' | null = null;
  @Input() comentario = '';
  @Input() isSaving = false;
  @Input() rendicion: AprobacionPendiente | null = null;

  @Output() comentarioChange = new EventEmitter<string>();
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  get modalTitle(): string {
    return this.accion === 'aprobar' ? 'Aprobar Rendición' : 'Rechazar Rendición';
  }

  onComentarioChange(value: string): void {
    this.comentarioChange.emit(value);
  }

  onConfirmar(): void {
    this.confirmar.emit();
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
