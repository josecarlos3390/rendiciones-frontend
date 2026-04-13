import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendPendiente, RendSync } from '@services/integracion.service';
import { FormModalComponent } from '@shared/form-modal/form-modal.component';
import { StatusBadgeComponent } from '@shared/status-badge/status-badge.component';
import { SkeletonLoaderComponent } from '@shared/skeleton-loader/skeleton-loader.component';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';

@Component({
  selector: 'app-integracion-historial-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormModalComponent,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    DdmmyyyyPipe,
  ],
  template: `
    <app-form-modal
      title="Historial de Sincronizacion"
      [subtitle]="historialRend ? 'Rendicion Nro ' + historialRend.U_IdRendicion : null"
      [isOpen]="isOpen"
      [isEditing]="false"
      [submitDisabled]="true"
      (cancel)="close.emit()">
      
      <ng-template #formContent>
        <div *ngIf="loading">
          <app-skeleton-loader variant="list" [rows]="3"></app-skeleton-loader>
        </div>

        <div *ngIf="!loading && items.length === 0" class="empty-state">
          Sin intentos de sincronizacion registrados
        </div>

        <div class="historial-list" *ngIf="!loading && items.length > 0">
          <div class="historial-item" *ngFor="let h of items">
            <div class="historial-item-header">
              <app-status-badge [type]="getSyncEstadoBadgeType(h.U_Estado)" [dot]="true">
                {{ getSyncEstadoBadgeText(h.U_Estado) }}
              </app-status-badge>
              <span class="historial-intento">Intento {{ h.U_Intento }}</span>
              <span class="historial-fecha">{{ h.U_FechaSync | ddmmyyyy }}</span>
              <span class="historial-admin muted">por {{ h.U_LoginAdmin ?? '-' }}</span>
            </div>
            <div class="historial-item-body" *ngIf="h.U_NroDocERP || h.U_Mensaje">
              <div *ngIf="h.U_NroDocERP" class="historial-doc">
                <span class="info-label">Doc. SAP</span>
                <code class="historial-code">{{ h.U_NroDocERP }}</code>
              </div>
              <div *ngIf="h.U_Mensaje" class="historial-msg" [class.historial-msg-error]="h.U_Estado === 'ERROR'">
                {{ h.U_Mensaje }}
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </app-form-modal>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: var(--text-muted);
    }
    
    .historial-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .historial-item {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    
    .historial-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: var(--bg-faint);
      flex-wrap: wrap;
    }
    
    .historial-intento {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .historial-fecha {
      font-size: var(--text-sm);
      color: var(--text-muted);
      margin-left: auto;
    }
    
    .historial-admin {
      font-size: var(--text-sm);
      color: var(--text-faint);
    }
    
    .historial-item-body {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .historial-doc {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .info-label {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-weight: var(--weight-medium);
    }
    
    .historial-code {
      font-family: var(--font-mono);
      font-size: var(--text-sm);
      background: var(--bg-subtle);
      padding: 2px 8px;
      border-radius: var(--radius-xs);
      color: var(--text-heading);
      word-break: break-all;
    }
    
    .historial-msg {
      font-size: var(--text-sm);
      color: var(--text-muted);
      line-height: 1.5;
      word-break: break-word;
    }
    
    .historial-msg-error {
      color: var(--color-danger-text);
    }
    
    .muted {
      color: var(--text-faint);
    }
    
    @media (max-width: 400px) {
      .historial-fecha {
        margin-left: 0;
        width: 100%;
        order: 10;
      }
      
      .historial-item-header {
        gap: 6px;
      }
    }
  `]
})
export class IntegracionHistorialModalComponent {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() items: RendSync[] = [];
  @Input() historialRend: RendPendiente | null = null;
  
  @Output() close = new EventEmitter<void>();

  getSyncEstadoBadgeType(estado: string): 'sync' | 'error' | 'pending' {
    if (estado === 'OK') return 'sync';
    if (estado === 'ERROR') return 'error';
    return 'pending';
  }

  getSyncEstadoBadgeText(estado: string): string {
    if (estado === 'OK') return 'Exito';
    if (estado === 'ERROR') return 'Error';
    return estado;
  }
}
