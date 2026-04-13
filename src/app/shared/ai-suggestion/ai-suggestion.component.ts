import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClasificacionSugeridaResponse } from '../../services/ai.service';

/**
 * Componente de sugerencia de IA para clasificación de gastos
 * Muestra la sugerencia con indicador de confianza y permite aplicarla
 */
@Component({
  selector: 'app-ai-suggestion',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai-suggestion-container" *ngIf="visible">
      <!-- Estado: IA Analizando -->
      <div class="ai-analyzing" *ngIf="isLoading">
        <div class="ai-spinner"></div>
        <span class="ai-text">{{ loadingMessage }}</span>
      </div>

      <!-- Estado: Sugerencia Recibida -->
      <div class="ai-suggestion" *ngIf="!isLoading && sugerencia && !error">
        <div class="ai-header">
          <span class="ai-icon">🤖</span>
          <span class="ai-title">Sugerencia IA</span>
          <span class="ai-confidence" [class.high]="confianzaAlta" [class.medium]="confianzaMedia" [class.low]="confianzaBaja">
            {{ sugerencia.cuentaContable.confianza | percent:'1.0-0' }}
          </span>
        </div>
        
        <div class="ai-content">
          <div class="ai-item">
            <span class="ai-label">Cuenta:</span>
            <span class="ai-value">{{ sugerencia.cuentaContable.codigo }} - {{ sugerencia.cuentaContable.nombre }}</span>
          </div>
          
          <div class="ai-item" *ngIf="sugerencia.dimension1">
            <span class="ai-label">Dimensión:</span>
            <span class="ai-value">{{ sugerencia.dimension1.codigo }} - {{ sugerencia.dimension1.nombre }}</span>
          </div>
          
          <div class="ai-item" *ngIf="sugerencia.norma">
            <span class="ai-label">Norma:</span>
            <span class="ai-value">{{ sugerencia.norma.descripcion }}</span>
          </div>
          
          <div class="ai-item" *ngIf="sugerencia.proyecto">
            <span class="ai-label">Proyecto:</span>
            <span class="ai-value">{{ sugerencia.proyecto.codigo }} - {{ sugerencia.proyecto.nombre }}</span>
          </div>
          
          <div class="ai-reason" *ngIf="sugerencia.razon" [title]="sugerencia.razon">
            <span>ℹ️</span>
            <span>{{ sugerencia.razon }}</span>
          </div>
        </div>

        <div class="ai-actions">
          <button class="btn-aplicar" (click)="onAplicar()">
            <span>✓</span>
            Aplicar sugerencia
          </button>
          <button class="btn-ignorar" (click)="onIgnorar()" title="Ignorar sugerencia">
            <span>✕</span>
          </button>
        </div>
      </div>

      <!-- Estado: Error -->
      <div class="ai-error" *ngIf="!isLoading && error">
        <span>⚠️</span>
        <span>{{ error }}</span>
      </div>
    </div>
  `,
  styles: [`
    .ai-suggestion-container {
      margin: 8px 0;
    }

    .ai-analyzing {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.8; }
    }

    .ai-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .ai-text {
      font-size: 14px;
      font-weight: 500;
    }

    .ai-suggestion {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      border: 2px solid #667eea;
      border-radius: 8px;
      padding: 12px 16px;
      position: relative;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd;
    }

    .ai-icon {
      font-size: 20px;
    }

    .ai-title {
      font-weight: 600;
      color: #333;
      flex: 1;
    }

    .ai-confidence {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      background: #e0e0e0;
    }

    .ai-confidence.high {
      background: #4caf50;
      color: white;
    }

    .ai-confidence.medium {
      background: #ff9800;
      color: white;
    }

    .ai-confidence.low {
      background: #f44336;
      color: white;
    }

    .ai-content {
      margin-bottom: 12px;
    }

    .ai-item {
      display: flex;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 13px;
    }

    .ai-label {
      font-weight: 500;
      color: #666;
      min-width: 80px;
    }

    .ai-value {
      color: #333;
      font-weight: 500;
    }

    .ai-reason {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      margin-top: 8px;
      padding: 8px;
      background: #fff3cd;
      border-radius: 4px;
      font-size: 12px;
      color: #856404;
    }

    .ai-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-aplicar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-aplicar:hover {
      background: #5a6fd6;
    }

    .btn-ignorar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: transparent;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-ignorar:hover {
      background: #f5f5f5;
      border-color: #999;
    }

    .ai-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #ffebee;
      border-radius: 8px;
      color: #c62828;
    }
  `]
})
export class AiSuggestionComponent implements OnChanges {
  @Input() sugerencia: ClasificacionSugeridaResponse | null = null;
  @Input() isLoading = false;
  @Input() loadingMessage = 'Analizando con IA...';
  @Input() error: string | null = null;
  @Input() visible = true;

  @Output() aplicar = new EventEmitter<ClasificacionSugeridaResponse>();
  @Output() ignorar = new EventEmitter<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sugerencia'] && this.sugerencia) {
      console.log('🤖 Sugerencia recibida:', this.sugerencia);
    }
  }

  get confianzaAlta(): boolean {
    return (this.sugerencia?.cuentaContable?.confianza || 0) >= 0.85;
  }

  get confianzaMedia(): boolean {
    const conf = this.sugerencia?.cuentaContable?.confianza || 0;
    return conf >= 0.6 && conf < 0.85;
  }

  get confianzaBaja(): boolean {
    return (this.sugerencia?.cuentaContable?.confianza || 0) < 0.6;
  }

  onAplicar(): void {
    if (this.sugerencia) {
      this.aplicar.emit(this.sugerencia);
    }
  }

  onIgnorar(): void {
    this.ignorar.emit();
  }
}
