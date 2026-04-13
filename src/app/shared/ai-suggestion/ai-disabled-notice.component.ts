import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente que muestra una notificación cuando IA no está habilitada
 * Invita al usuario a activarla para usar funcionalidades avanzadas
 */
@Component({
  selector: 'app-ai-disabled-notice',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai-notice-container" *ngIf="visible">
      <div class="ai-notice-content">
        <span class="ai-notice-icon">🤖</span>
        <div class="ai-notice-text">
          <span class="ai-notice-title">Funciones IA disponibles</span>
          <span class="ai-notice-subtitle">Activa la IA para sugerencias automáticas de clasificación</span>
        </div>
        <button 
          class="btn-saber-mas"
          (click)="onActivar()"
          title="Solicitar activación de IA al administrador">
          Saber más
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ai-notice-container {
      margin: 8px 0;
    }

    .ai-notice-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
      border: 1px dashed #9e9e9e;
      border-radius: 8px;
    }

    .ai-notice-icon {
      font-size: 24px;
      opacity: 0.6;
    }

    .ai-notice-text {
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 2px;
    }

    .ai-notice-title {
      font-weight: 500;
      color: #616161;
      font-size: 14px;
    }

    .ai-notice-subtitle {
      font-size: 12px;
      color: #9e9e9e;
    }

    .btn-saber-mas {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid #667eea;
      color: #667eea;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-saber-mas:hover {
      background: #667eea;
      color: white;
    }
  `]
})
export class AiDisabledNoticeComponent {
  @Input() visible = true;

  onActivar(): void {
    alert(
      '🤖 Funcionalidades de IA\n\n' +
      'Las funciones de Inteligencia Artificial permiten:\n' +
      '• Sugerir automáticamente cuentas contables\n' +
      '• Clasificar gastos según el concepto\n' +
      '• Validar facturas contra SIAT\n\n' +
      'Contacta al administrador del sistema para activar IA.'
    );
  }
}
