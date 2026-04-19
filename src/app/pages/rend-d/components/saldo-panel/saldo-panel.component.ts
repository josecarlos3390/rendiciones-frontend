import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Panel de control de saldo de la rendición
 * Muestra monto inicial, total rendido y saldo restante/excedido
 */
@Component({
  selector: 'app-saldo-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="saldo-panel" *ngIf="montoInicial > 0">
      <div class="saldo-row">
        <div class="saldo-item">
          <span class="saldo-label">Monto Inicial</span>
          <span class="saldo-value mono">{{ montoInicial | number:'1.2-2' }}</span>
        </div>
        <div class="saldo-item">
          <span class="saldo-label">Total Rendido</span>
          <span class="saldo-value mono">{{ totalRendido | number:'1.2-2' }}</span>
        </div>
        <div class="saldo-item" 
             [class.saldo-ok]="!estaExcedido && !estaExacto"
             [class.saldo-exacto]="estaExacto"
             [class.saldo-excedido]="estaExcedido">
          <span class="saldo-label">{{ labelSaldo }}</span>
          <span class="saldo-value mono">
            {{ estaExcedido ? '-' : '' }}{{ montoSaldo | number:'1.2-2' }}
          </span>
        </div>
      </div>

      <!-- Barra de progreso -->
      <div class="saldo-bar-wrap">
        <div class="saldo-bar">
          <div class="saldo-bar-fill"
            [class.saldo-bar-ok]="!estaExcedido && !estaExacto"
            [class.saldo-bar-exacto]="estaExacto"
            [class.saldo-bar-excedido]="estaExcedido"
            [style.width.%]="porcentaje">
          </div>
        </div>
        <span class="saldo-pct">{{ porcentaje | number:'1.0-0' }}%</span>
      </div>
    </div>
  `,
  styles: [`
    .saldo-panel {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }

    .saldo-row {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .saldo-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 120px;
    }

    .saldo-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .saldo-value {
      font-size: 18px;
      font-weight: 600;
      font-family: ui-monospace, monospace;
      color: var(--text-primary, #111827);
    }

    /* Estados del saldo */
    .saldo-ok .saldo-value {
      color: var(--success-color, #10b981);
    }

    .saldo-exacto .saldo-value {
      color: var(--info-color, #3b82f6);
    }

    .saldo-excedido .saldo-value {
      color: var(--danger-color, #ef4444);
    }

    /* Barra de progreso */
    .saldo-bar-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .saldo-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary, #e5e7eb);
      border-radius: 4px;
      overflow: hidden;
    }

    .saldo-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease, background-color 0.3s ease;
      min-width: 4px;
    }

    .saldo-bar-ok {
      background: linear-gradient(90deg, var(--success-color, #10b981), #34d399);
    }

    .saldo-bar-exacto {
      background: linear-gradient(90deg, var(--info-color, #3b82f6), #60a5fa);
    }

    .saldo-bar-excedido {
      background: linear-gradient(90deg, var(--danger-color, #ef4444), #f87171);
    }

    .saldo-pct {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted, #6b7280);
      min-width: 40px;
      text-align: right;
    }

    :host-context([data-theme="dark"]) .saldo-panel {
      background: var(--bg-card-dark, #1f2937);
      border-color: var(--border-color-dark, #374151);
    }

    :host-context([data-theme="dark"]) .saldo-value {
      color: var(--text-primary-dark, #f9fafb);
    }

    :host-context([data-theme="dark"]) .saldo-bar {
      background: var(--bg-secondary-dark, #374151);
    }
  `],
})
export class SaldoPanelComponent {
  @Input() montoInicial = 0;
  @Input() totalRendido = 0;

  get montoSaldo(): number {
    if (this.estaExcedido) {
      return this.totalRendido - this.montoInicial;
    }
    return this.montoInicial - this.totalRendido;
  }

  get estaExcedido(): boolean {
    return this.totalRendido > this.montoInicial;
  }

  get estaExacto(): boolean {
    return this.totalRendido === this.montoInicial;
  }

  get labelSaldo(): string {
    if (this.estaExcedido) return 'Excedido en';
    if (this.estaExacto) return 'Saldo';
    return 'Falta rendir';
  }

  get porcentaje(): number {
    if (this.montoInicial <= 0) return 0;
    const pct = (this.totalRendido / this.montoInicial) * 100;
    return Math.min(pct, 100);
  }
}
