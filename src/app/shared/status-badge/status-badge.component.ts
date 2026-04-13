import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Tipos de badge soportados
 */
export type BadgeType = 
  | 'primary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'neutral'
  | 'open'      // Abierto/Pendiente
  | 'closed'    // Cerrado/Completado
  | 'sync'      // Sincronizado
  | 'error'     // Error
  | 'pending';  // Pendiente/En proceso

/**
 * Componente unificado para badges de estado
 * 
 * Uso:
 * <app-status-badge type="success">Activo</app-status-badge>
 * <app-status-badge type="danger" pill>Error</app-status-badge>
 * <app-status-badge type="open" dot>Abierto</app-status-badge>
 * <app-status-badge type="sync" icon="✓">Sincronizado</app-status-badge>
 */

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-badge" [class]="badgeClass" [ngClass]="{ 'badge-pill': pill }">
      <span class="badge-dot" *ngIf="dot"></span>
      <span class="badge-icon" *ngIf="icon">{{ icon }}</span>
      <span class="badge-text"><ng-content></ng-content></span>
    </span>
  `,
  styleUrls: ['./status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  /** Tipo de badge (determina el color) */
  @Input() type: BadgeType = 'neutral';
  
  /** Mostrar como pill (bordes redondeados) */
  @Input() pill = true;
  
  /** Mostrar un punto indicador antes del texto */
  @Input() dot = false;
  
  /** Icono a mostrar antes del texto (emoji o carácter) */
  @Input() icon: string | null = null;
  
  /** Tamaño del badge: sm, md, lg */
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get badgeClass(): string {
    return `badge-${this.type} badge-${this.size}`;
  }
}
