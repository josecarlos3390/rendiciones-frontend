import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingIndicatorService } from './loading-indicator.service';

/**
 * Barra de progreso global para navegación
 * Se muestra en la parte superior del header
 */
@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div class="loading-bar-container">
        <div class="loading-bar"></div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      pointer-events: none;
    }

    .loading-bar-container {
      width: 100%;
      height: 3px;
      background: rgba(59, 130, 246, 0.2);
      overflow: hidden;
    }

    .loading-bar {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #60a5fa);
      animation: loading 1s ease-in-out infinite;
      transform-origin: left;
    }

    @keyframes loading {
      0% {
        transform: translateX(-100%) scaleX(0.3);
      }
      50% {
        transform: translateX(0%) scaleX(0.8);
      }
      100% {
        transform: translateX(100%) scaleX(0.3);
      }
    }
  `]
})
export class LoadingIndicatorComponent {
  loadingService = inject(LoadingIndicatorService);
}
