import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ValidacionSiatResult {
  valido: boolean;
  estadoSIAT: string;
  datosSIAT: {
    nit: string;
    numero: string;
    cuf: string;
    fecha: string;
    monto: number;
    estado: string;
    razonSocial?: string;
  };
  datosPDF: {
    nit?: string;
    numeroFactura?: string;
    fecha?: string;
    monto?: number;
  };
  discrepancias: Array<{
    campo: string;
    pdf: string | number;
    siat: string | number;
    explicacion: string;
  }>;
  recomendacion: string;
  riesgo: 'bajo' | 'medio' | 'alto';
}

/**
 * Componente para mostrar resultados de validación SIAT
 */
@Component({
  selector: 'app-siat-validator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="siat-validator" *ngIf="resultado">
      <!-- Header con estado -->
      <div class="siat-header" [class.valid]="resultado.valido" [class.invalid]="!resultado.valido">
        <span class="siat-icon">{{ resultado.valido ? '✅' : '⚠️' }}</span>
        <span class="siat-title">
          {{ resultado.valido ? 'Factura Validada' : 'Revisar Factura' }}
        </span>
        <span class="siat-estado">{{ resultado.estadoSIAT }}</span>
      </div>

      <!-- Datos comparativos -->
      <div class="siat-comparison" *ngIf="!resultado.valido && resultado.discrepancias.length > 0">
        <h4>Discrepancias encontradas:</h4>
        <div class="discrepancia-item" *ngFor="let disc of resultado.discrepancias" [class]="'riesgo-' + resultado.riesgo">
          <div class="disc-campo">{{ disc.campo | titlecase }}</div>
          <div class="disc-valores">
            <div class="disc-pdf">
              <span class="label">PDF:</span>
              <span class="valor">{{ disc.pdf }}</span>
            </div>
            <div class="disc-flecha">→</div>
            <div class="disc-siat">
              <span class="label">SIAT:</span>
              <span class="valor">{{ disc.siat }}</span>
            </div>
          </div>
          <div class="disc-explicacion" *ngIf="disc.explicacion">
            {{ disc.explicacion }}
          </div>
        </div>
      </div>

      <!-- Datos del SIAT (si es válida) -->
      <div class="siat-datos" *ngIf="resultado.valido">
        <div class="dato-item">
          <span class="label">NIT Emisor:</span>
          <span class="valor">{{ resultado.datosSIAT.nit }}</span>
        </div>
        <div class="dato-item">
          <span class="label">Razón Social:</span>
          <span class="valor">{{ resultado.datosSIAT.razonSocial || 'No disponible' }}</span>
        </div>
        <div class="dato-item">
          <span class="label">N° Factura:</span>
          <span class="valor">{{ resultado.datosSIAT.numero }}</span>
        </div>
        <div class="dato-item">
          <span class="label">Fecha:</span>
          <span class="valor">{{ resultado.datosSIAT.fecha }}</span>
        </div>
        <div class="dato-item">
          <span class="label">Monto:</span>
          <span class="valor">{{ resultado.datosSIAT.monto | number:'1.2-2' }} Bs.</span>
        </div>
      </div>

      <!-- Recomendación -->
      <div class="siat-recomendacion" [class]="'riesgo-' + resultado.riesgo">
        <span class="rec-icon">💡</span>
        <span class="rec-texto">{{ resultado.recomendacion }}</span>
      </div>

      <!-- Acciones -->
      <div class="siat-actions">
        <button class="btn-aceptar" *ngIf="resultado.valido" (click)="onAceptar()">
          ✓ Usar datos del SIAT
        </button>
        <button class="btn-manual" (click)="onManual()">
          ✎ Ingreso manual
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div class="siat-loading" *ngIf="loading">
      <div class="spinner"></div>
      <span>Validando con SIAT...</span>
    </div>
  `,
  styles: [`
    .siat-validator {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
    }

    .siat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .siat-header.valid {
      background: #d4edda;
      color: #155724;
    }

    .siat-header.invalid {
      background: #fff3cd;
      color: #856404;
    }

    .siat-icon { font-size: 20px; }
    .siat-title { flex: 1; font-weight: 600; }
    .siat-estado {
      font-size: 12px;
      padding: 2px 8px;
      background: rgba(0,0,0,0.1);
      border-radius: 12px;
    }

    .siat-comparison h4 { margin: 0 0 12px 0; color: #333; }

    .discrepancia-item {
      background: white;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 0 6px 6px 0;
    }
    .discrepancia-item.riesgo-alto { border-left-color: #dc3545; }
    .discrepancia-item.riesgo-medio { border-left-color: #ffc107; }
    .discrepancia-item.riesgo-bajo { border-left-color: #28a745; }

    .disc-campo {
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .disc-valores {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .disc-pdf, .disc-siat {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .disc-flecha { color: #999; font-size: 20px; }

    .label { font-size: 11px; color: #999; }
    .valor { font-weight: 600; color: #333; }

    .disc-explicacion {
      font-size: 12px;
      color: #666;
      font-style: italic;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .siat-datos {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .dato-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }
    .dato-item:last-child { border-bottom: none; }

    .siat-recomendacion {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .siat-recomendacion.riesgo-bajo { background: #d4edda; color: #155724; }
    .siat-recomendacion.riesgo-medio { background: #fff3cd; color: #856404; }
    .siat-recomendacion.riesgo-alto { background: #f8d7da; color: #721c24; }

    .siat-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-aceptar, .btn-manual {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-aceptar { background: #28a745; color: white; }
    .btn-aceptar:hover { background: #218838; }
    .btn-manual { background: #6c757d; color: white; }
    .btn-manual:hover { background: #5a6268; }

    .siat-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 24px;
      color: #666;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #f3f3f3;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class SiatValidatorComponent {
  @Input() resultado: ValidacionSiatResult | null = null;
  @Input() loading = false;

  @Output() aceptar = new EventEmitter<void>();
  @Output() manual = new EventEmitter<void>();

  onAceptar(): void { this.aceptar.emit(); }
  onManual(): void { this.manual.emit(); }
}
