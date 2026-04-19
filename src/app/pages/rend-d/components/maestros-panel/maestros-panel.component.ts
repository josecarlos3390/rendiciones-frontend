import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DdmmyyyyPipe } from '@shared/ddmmyyyy.pipe';
import { RendM } from '@models/rend-m.model';

/**
 * Panel de datos maestros de la rendición
 * Muestra información de cabecera: perfil, cuenta, empleado, fechas, etc.
 * 
 * UX Móvil:
 * - Grid de 2 columnas en móvil para aprovechar espacio
 * - Texto multilinea para campos largos
 * - Orden prioritario de información
 */
@Component({
  selector: 'app-maestros-panel',
  standalone: true,
  imports: [CommonModule, DdmmyyyyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="maestros-panel" *ngIf="cabecera">
      <div class="maestro-grid">
        <!-- Fila 1: Rendición y Perfil (2 columnas) -->
        <div class="maestro-item">
          <span class="maestro-label">Rendición N°</span>
          <span class="maestro-value mono">{{ cabecera.U_IdRendicion }}</span>
        </div>
        <div class="maestro-item">
          <span class="maestro-label">Perfil</span>
          <span class="maestro-value maestro-multiline" [title]="cabecera.U_NombrePerfil">{{ cabecera.U_NombrePerfil }}</span>
        </div>
        
        <!-- Fila 2: Cuenta (full width si tiene nombre largo) -->
        <div class="maestro-item maestro-item-wide">
          <span class="maestro-label">Cuenta</span>
          <div class="maestro-cuenta">
            <span class="maestro-value mono">{{ cabecera.U_Cuenta }}</span>
            <span class="maestro-sub maestro-multiline" *ngIf="cabecera.U_NombreCuenta" [title]="cabecera.U_NombreCuenta">{{ cabecera.U_NombreCuenta }}</span>
          </div>
        </div>
        
        <!-- Fila 3: Empleado y Usuario -->
        <div class="maestro-item">
          <span class="maestro-label">Empleado</span>
          <span class="maestro-value mono maestro-multiline">{{ cabecera.U_Empleado || '—' }}</span>
        </div>
        <div class="maestro-item">
          <span class="maestro-label">Usuario</span>
          <span class="maestro-value">{{ cabecera.U_NomUsuario }}</span>
        </div>
        
        <!-- Fila 4: Objetivo (full width) -->
        <div class="maestro-item maestro-item-wide">
          <span class="maestro-label">Objetivo</span>
          <span class="maestro-value maestro-multiline" [title]="cabecera.U_Objetivo">{{ cabecera.U_Objetivo }}</span>
        </div>
        
        <!-- Fila 5: Fechas -->
        <div class="maestro-item">
          <span class="maestro-label">Fecha Inicio</span>
          <span class="maestro-value">{{ cabecera.U_FechaIni | ddmmyyyy }}</span>
        </div>
        <div class="maestro-item">
          <span class="maestro-label">Fecha Final</span>
          <span class="maestro-value">{{ cabecera.U_FechaFinal | ddmmyyyy }}</span>
        </div>
        
        <!-- Fila 6: Monto (destacado) -->
        <div class="maestro-item maestro-item-monto">
          <span class="maestro-label">Monto Inicial</span>
          <span class="maestro-monto">{{ cabecera.U_Monto | number:'1.2-2' }}</span>
        </div>
      </div>
      
      <div class="maestros-banner readonly-banner" *ngIf="isReadonly">
        ⚠ Esta rendición está en estado
        <strong>{{ estadoTexto }}</strong> — solo lectura.
      </div>
    </div>
  `,
  styles: [`
    .maestros-panel {
      background: var(--bg-card, #ffffff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .maestro-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .maestro-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .maestro-item-wide {
      grid-column: 1 / -1;
    }

    .maestro-item-monto {
      grid-column: 1 / -1;
      background: var(--color-primary-bg, rgba(99, 102, 241, 0.1));
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: 4px;
    }

    .maestro-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .maestro-value {
      font-size: 12px;
      color: var(--text-primary, #111827);
      font-weight: 500;
      line-height: 1.3;
    }

    .maestro-value.mono {
      font-family: ui-monospace, monospace;
    }

    /* Texto multilinea con truncamiento opcional */
    .maestro-multiline {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }

    .maestro-cuenta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .maestro-sub {
      font-size: 12px;
      color: var(--text-muted, #6b7280);
      line-height: 1.3;
    }

    .maestro-monto {
      font-size: 16px;
      font-weight: 700;
      color: var(--color-primary, #6366f1);
      font-family: ui-monospace, monospace;
    }

    .maestros-banner {
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.4;
    }

    .readonly-banner {
      background: var(--warning-bg, #fef3c7);
      color: var(--warning-text, #92400e);
      border: 1px solid var(--warning-border, #fbbf24);
    }

    /* Desktop: más espacio */
    @media (min-width: 768px) {
      .maestros-panel {
        padding: 20px;
      }
      
      .maestro-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px 24px;
      }
      
      .maestro-item-wide {
        grid-column: span 2;
      }
      
      .maestro-item-monto {
        grid-column: auto;
      }
      
      .maestro-value {
        font-size: 13px;
      }
      
      .maestro-monto {
        font-size: 18px;
      }
    }

    :host-context([data-theme="dark"]) .maestros-panel {
      background: var(--bg-card-dark, #1f2937);
      border-color: var(--border-color-dark, #374151);
    }

    :host-context([data-theme="dark"]) .maestro-value {
      color: var(--text-primary-dark, #f9fafb);
    }

    :host-context([data-theme="dark"]) .readonly-banner {
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.3);
    }
  `],
})
export class MaestrosPanelComponent {
  @Input() cabecera: RendM | null = null;
  @Input() isReadonly = false;

  get estadoTexto(): string {
    if (!this.cabecera) return '';
    return this.cabecera.U_Estado === 2 ? 'CERRADO' : 'ENVIADO';
  }
}
