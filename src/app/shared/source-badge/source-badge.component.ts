import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-source-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="source-badge" [ngClass]="badgeClass" [title]="tooltip">
      <ng-container [ngSwitch]="source">
        <!-- Icono SIAT -->
        <svg *ngSwitchCase="'siat'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        
        <!-- Icono IA -->
        <svg *ngSwitchCase="'ai_claude'" class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/>
        </svg>
        
        <!-- Icono Manual -->
        <svg *ngSwitchDefault class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </ng-container>
      
      <span class="badge-text">{{ label }}</span>
      
      <!-- Indicador de confianza para IA -->
      <span *ngIf="source === 'ai_claude' && confidence" class="confidence-indicator" [ngClass]="confidenceClass">
        {{ confidence | percent:'1.0-0' }}
      </span>
    </span>
  `,
  styles: [`
    .source-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .badge-icon {
      width: 12px;
      height: 12px;
    }
    
    .badge-text {
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    /* SIAT - Verde */
    .source-siat {
      background: rgba(16, 185, 129, 0.15);
      color: #059669;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    /* IA Claude - Violeta */
    .source-ai {
      background: rgba(139, 92, 246, 0.15);
      color: #7c3aed;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
    
    /* Manual - Gris */
    .source-manual {
      background: rgba(107, 114, 128, 0.15);
      color: #4b5563;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }
    
    /* Indicador de confianza */
    .confidence-indicator {
      margin-left: 4px;
      padding: 0 4px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
    }
    
    .confidence-high {
      background: rgba(16, 185, 129, 0.2);
      color: #059669;
    }
    
    .confidence-medium {
      background: rgba(245, 158, 11, 0.2);
      color: #d97706;
    }
    
    .confidence-low {
      background: rgba(239, 68, 68, 0.2);
      color: #dc2626;
    }
    
    /* Dark theme */
    :host-context([data-theme="dark"]) .source-siat {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    
    :host-context([data-theme="dark"]) .source-ai {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
    }
    
    :host-context([data-theme="dark"]) .source-manual {
      background: rgba(156, 163, 175, 0.2);
      color: #d1d5db;
    }
  `]
})
export class SourceBadgeComponent {
  @Input() source: 'siat' | 'ai_claude' | 'manual' = 'manual';
  @Input() confidence?: number;
  
  get label(): string {
    switch (this.source) {
      case 'siat': return 'SIAT';
      case 'ai_claude': return 'IA';
      default: return 'Manual';
    }
  }
  
  get badgeClass(): string {
    switch (this.source) {
      case 'siat': return 'source-siat';
      case 'ai_claude': return 'source-ai';
      default: return 'source-manual';
    }
  }
  
  get confidenceClass(): string {
    if (!this.confidence) return '';
    if (this.confidence >= 0.85) return 'confidence-high';
    if (this.confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }
  
  get tooltip(): string {
    switch (this.source) {
      case 'siat':
        return 'Datos obtenidos del SIAT (Servicio de Impuestos Nacionales de Bolivia)';
      case 'ai_claude':
        return `Datos extraídos por IA (Claude)\\nConfianza: ${(this.confidence || 0) * 100}%`;
      default:
        return 'Datos ingresados manualmente';
    }
  }
}
