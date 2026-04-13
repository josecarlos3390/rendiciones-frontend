import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';


/**
 * LoadingStateComponent — Contenedor elegante para estados de carga
 *
 * Estados: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,

  styles: [`
    :host { display: block; }

    /* Skeleton para tabla */
    .skeleton-table {
      width: 100%;
    }
    .skeleton-header {
      display: grid;
      grid-template-columns: repeat(var(--columns, 4), 1fr);
      gap: 16px;
      padding: 12px 16px;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-soft);
      margin-bottom: 12px;
    }
    .skeleton-row {
      display: grid;
      grid-template-columns: repeat(var(--columns, 4), 1fr);
      gap: 16px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-soft);
    }
    .skeleton-cell {
      height: 16px;
      background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--border-soft) 50%, var(--bg-subtle) 75%);
      background-size: 200% 100%;
      border-radius: var(--radius-sm);
      animation: shimmer 1.8s ease-in-out infinite;
    }
    .skeleton-cell--short { width: 40%; }
    .skeleton-cell--long { width: 100%; }
    .skeleton-cell--medium { width: 70%; }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Spinner */
    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      gap: 16px;
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid var(--bg-subtle);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner-text {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-weight: var(--weight-medium);
    }

    /* Estados de mensaje (empty/error) */
    .message-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      text-align: center;
    }
    .state-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }
    .state-title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      color: var(--text-heading);
      margin: 0 0 8px;
    }
    .state-description {
      font-size: var(--text-base);
      color: var(--text-muted);
      margin: 0 0 20px;
      line-height: var(--leading-normal);
      max-width: 360px;
    }
    .error-state .state-icon { opacity: 0.8; }
    .error-state .state-title { color: var(--color-danger); }

    /* Contenido con fade-in */
    .content-wrapper {
      animation: fadeIn 0.35s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  template: `
    <!-- LOADING: Skeleton -->
    <div *ngIf="state === 'loading' && skeletonRows > 0" class="skeleton-table" [style.--columns]="skeletonColumns">
      <div class="skeleton-header">
        <div class="skeleton-cell" *ngFor="let h of skeletonHeaders"></div>
      </div>
      <div class="skeleton-row" *ngFor="let row of skeletonRowsArray">
        <div class="skeleton-cell skeleton-cell--short"></div>
        <div class="skeleton-cell skeleton-cell--long"></div>
        <div class="skeleton-cell skeleton-cell--medium"></div>
        <div class="skeleton-cell skeleton-cell--short" *ngIf="skeletonColumns >= 4"></div>
        <div class="skeleton-cell skeleton-cell--short" *ngIf="skeletonColumns >= 5"></div>
      </div>
    </div>

    <!-- LOADING: Spinner (si no hay skeleton) -->
    <div *ngIf="state === 'loading' && skeletonRows === 0" class="spinner-wrapper">
      <div class="spinner"></div>
      <span class="spinner-text">{{ loadingText }}</span>
    </div>

    <!-- EMPTY -->
    <div *ngIf="state === 'empty'" class="message-state">
      <span class="state-icon">{{ emptyIcon }}</span>
      <h3 class="state-title">{{ emptyTitle }}</h3>
      <p class="state-description">{{ emptyMessage }}</p>
      <button *ngIf="showEmptyAction" class="btn btn-primary" (click)="emptyAction.emit()">
        {{ emptyActionText }}
      </button>
    </div>

    <!-- ERROR -->
    <div *ngIf="state === 'error'" class="message-state error-state">
      <span class="state-icon">⚠️</span>
      <h3 class="state-title">{{ errorTitle }}</h3>
      <p class="state-description">{{ errorMessage }}</p>
      <button class="btn btn-ghost" (click)="retry.emit()">
        🔄 Reintentar
      </button>
    </div>

    <!-- SUCCESS: Contenido -->
    <div *ngIf="state === 'success'" class="content-wrapper">
      <ng-content></ng-content>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() state: LoadingState = 'idle';
  
  // Skeleton config
  @Input() skeletonRows = 5;
  @Input() skeletonColumns = 4;
  @Input() skeletonHeaders: string[] = [];

  // Texts
  @Input() loadingText = 'Cargando...';
  @Input() emptyIcon = '📭';
  @Input() emptyTitle = 'Sin registros';
  @Input() emptyMessage = 'No hay datos para mostrar.';
  @Input() showEmptyAction = false;
  @Input() emptyActionText = 'Crear nuevo';
  @Input() errorTitle = 'Error al cargar';
  @Input() errorMessage = 'No se pudieron cargar los datos. Intenta nuevamente.';

  // Outputs
  @Output() emptyAction = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  get skeletonRowsArray(): number[] {
    return Array.from({ length: this.skeletonRows }, (_, i) => i);
  }
}
