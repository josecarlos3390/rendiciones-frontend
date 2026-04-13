import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Dumb Component: Estado vacío
 * Muestra mensajes diferentes según rol y si hay búsqueda activa
 */
@Component({
  selector: 'app-integracion-empty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <!-- Estado vacío sin búsqueda -->
    <div *ngIf="!search" class="empty-state">
      <div class="empty-icon">{{ isAdmin || puedeSync ? '✅' : '📋' }}</div>
      <p *ngIf="isAdmin || puedeSync">No hay rendiciones pendientes de sincronización</p>
      <p *ngIf="!isAdmin && !puedeSync">No tenés rendiciones aprobadas o sincronizadas aún</p>
      <span class="empty-hint" *ngIf="isAdmin || puedeSync">
        Las rendiciones aprobadas aparecerán aquí para ser enviadas al ERP
      </span>
      <span class="empty-hint" *ngIf="!isAdmin && !puedeSync">
        Cuando tu rendición sea aprobada y sincronizada, aparecerá aquí con el número de documento SAP
      </span>
    </div>

    <!-- Estado vacío con búsqueda -->
    <div *ngIf="search" class="empty-state">
      Sin resultados para "{{ search }}"
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .empty-state {
      text-align: center;
      padding: 48px 20px;
      color: var(--text-muted);
      
      p {
        margin: 0;
        font-size: var(--text-base);
        color: var(--text-primary);
      }
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-hint {
      display: block;
      margin-top: 6px;
      font-size: var(--text-sm);
      color: var(--text-faint);
    }
    
    @media (max-width: 640px) {
      .empty-state {
        padding: 32px 16px;
      }
      
      .empty-icon {
        font-size: 36px;
      }
    }
  `]
})
export class IntegracionEmptyComponent {
  @Input() isAdmin = false;
  @Input() puedeSync = false;
  @Input() search = '';
}
