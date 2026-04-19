import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AiService } from '@services/ai.service';
import { Observable } from 'rxjs';

/**
 * Indicador flotante de procesamiento de IA
 * Se muestra cuando alguna operación de IA está en curso
 */
@Component({
  selector: 'app-ai-processing-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai-indicator" *ngIf="isLoading$ | async">
      <div class="ai-indicator-content">
        <div class="ai-spinner"></div>
        <span class="ai-indicator-text">{{ mensaje$ | async }}</span>
        <div class="ai-indicator-pulse"></div>
      </div>
    </div>
  `,
  styles: [`
    .ai-indicator {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(100px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .ai-indicator-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 24px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      color: white;
    }

    .ai-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .ai-indicator-text {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .ai-indicator-pulse {
      width: 8px;
      height: 8px;
      background: #4caf50;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.7;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `]
})
export class AiProcessingIndicatorComponent {
  isLoading$: Observable<boolean>;
  mensaje$: Observable<string>;

  constructor(private aiService: AiService) {
    this.isLoading$ = this.aiService.loading$;
    this.mensaje$ = this.aiService.mensajeIA$;
  }
}
