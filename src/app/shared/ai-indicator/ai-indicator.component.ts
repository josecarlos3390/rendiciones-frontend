import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AiService, AiStatus } from '../../services/ai.service';

/**
 * Indicador visual del estado de IA en el header
 * Muestra si la IA está habilitada y configurada
 */
@Component({
  selector: 'app-ai-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div 
      class="ai-indicator"
      [class.ai-active]="estaHabilitada"
      [class.ai-inactive]="!estaHabilitada"
      [title]="tooltipText"
    >
      <!-- Icono de IA (Sparkles/Estrellitas) -->
      <svg class="ai-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <!-- Estrella central -->
        <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" 
              class="sparkle-main"/>
        <!-- Destellos pequeños -->
        <path d="M4 4l1 1M20 4l-1 1M4 20l1-1M20 20l-1-1" class="sparkle-glow"/>
      </svg>
      
      <!-- Texto opcional (visible en desktop) -->
      <span class="ai-text" *ngIf="showText">
        {{ estaHabilitada ? 'IA Activa' : 'IA Inactiva' }}
      </span>
      
      <!-- Indicador de estado (punto) -->
      <span class="ai-status-dot" [class.active]="estaHabilitada"></span>
    </div>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }
    
    .ai-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: var(--radius-md);
      cursor: default;
      transition: all 0.2s ease;
      background: transparent;
      border: 1px solid transparent;
    }
    
    /* Estado Activo */
    .ai-active {
      color: #8b5cf6; /* Violeta IA */
    }
    
    .ai-active .ai-icon {
      animation: ai-pulse 2s ease-in-out infinite;
    }
    
    /* Estado Inactivo */
    .ai-inactive {
      color: var(--text-muted);
      opacity: 0.7;
    }
    
    .ai-inactive .ai-icon {
      opacity: 0.5;
    }
    
    /* Icono */
    .ai-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    
    .sparkle-main {
      fill: currentColor;
      fill-opacity: 0.2;
    }
    
    .sparkle-glow {
      opacity: 0.6;
    }
    
    /* Texto */
    .ai-text {
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    
    /* Punto de estado */
    .ai-status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);
      flex-shrink: 0;
    }
    
    .ai-status-dot.active {
      background: #10b981; /* Verde */
      box-shadow: 0 0 6px #10b981;
      animation: dot-pulse 2s ease-in-out infinite;
    }
    
    /* Animaciones */
    @keyframes ai-pulse {
      0%, 100% { 
        opacity: 1;
        transform: scale(1);
        filter: drop-shadow(0 0 2px currentColor);
      }
      50% { 
        opacity: 0.8;
        transform: scale(1.05);
        filter: drop-shadow(0 0 6px currentColor);
      }
    }
    
    @keyframes dot-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    /* Responsive - solo icono en móvil */
    @media (max-width: 768px) {
      .ai-text {
        display: none;
      }
      
      .ai-indicator {
        padding: 6px;
      }
    }
    
    /* Dark theme ajustes */
    :host-context([data-theme="dark"]) .ai-active {
      color: #a78bfa;
    }
    
    :host-context([data-theme="dark"]) .sparkle-main {
      fill-opacity: 0.3;
    }
  `]
})
export class AiIndicatorComponent implements OnInit, OnDestroy {
  status: AiStatus | null = null;
  showText = true;
  private destroy$ = new Subject<void>();
  
  constructor(
    private aiService: AiService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit() {
    // Suscribirse a cambios del estado
    this.aiService.aiStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.status = status;
        this.cdr.markForCheck();
      });
    
    // Cargar estado inicial si no está cargado
    if (!this.aiService.status) {
      this.cargarStatus();
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private cargarStatus() {
    this.aiService.cargarStatus().subscribe({
      next: (status: AiStatus) => {
        this.status = status;
        this.cdr.markForCheck();
      },
      error: () => {
        this.status = {
          ia: { enabled: false, provider: '', model: '', configured: false, version: '' },
          modo: { dbType: 'HANA', appMode: 'ONLINE', isOnline: true, isOffline: false, usesServiceLayer: true, isValidConfiguration: true }
        };
        this.cdr.markForCheck();
      }
    });
  }
  
  /**
   * true si IA está habilitada y configurada
   */
  get estaHabilitada(): boolean {
    return this.status?.ia?.enabled === true && this.status?.ia?.configured === true;
  }
  
  get tooltipText(): string {
    if (!this.status) return 'Verificando estado de IA...';
    
    if (this.estaHabilitada) {
      return `IA Activa - ${this.status.ia.provider} (${this.status.ia.model})`;
    } else {
      return 'IA Inactiva - Configure IA_ENABLED en el servidor';
    }
  }
}
