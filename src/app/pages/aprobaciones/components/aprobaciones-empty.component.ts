import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aprobaciones-empty',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">📋</div>
      <p>No hay aprobaciones pendientes</p>
      <span class="empty-hint">
        Las rendiciones enviadas que requieran tu aprobación aparecerán aquí
      </span>
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
  `],
})
export class AprobacionesEmptyComponent {}
