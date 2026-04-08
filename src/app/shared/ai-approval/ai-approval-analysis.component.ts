import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AnalisisAprobacionResult {
  idRendicion: number;
  modo: 'ONLINE' | 'OFFLINE';
  scoreRiesgo: number;
  nivel: 'bajo' | 'medio' | 'alto';
  recomendacion: 'aprobar' | 'rechazar' | 'revisar';
  justificacion: string;
  factoresPositivos: string[];
  factoresRiesgo: string[];
  analisisSolicitante: {
    nombre: string;
    rendicionesPrevias: number;
    tasaAprobacion: number;
    montoPromedio: number;
    antiguedadMeses: number;
  };
  analisisMontos: {
    montoActual: number;
    montoPromedioUsuario: number;
    variacionPorcentaje: number;
    esAnormal: boolean;
  };
  alertas: string[];
  datosSAP?: {
    presupuestoDisponible?: number;
    presupuestoConsumido?: number;
  } | null;
}

@Component({
  selector: 'app-ai-approval-analysis',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-approval-card" *ngIf="analisis">
      <div class="ai-header" [class]="'nivel-' + analisis.nivel">
        <div class="ai-score-section">
          <div class="ai-score-circle" [class]="'score-' + analisis.nivel">
            <span class="score-value">{{ analisis.scoreRiesgo }}</span>
            <span class="score-label">riesgo</span>
          </div>
          <div class="ai-score-info">
            <span class="ai-badge">🤖 Análisis IA</span>
            <span class="ai-nivel" [class]="'nivel-text-' + analisis.nivel">
              Nivel {{ analisis.nivel | titlecase }}
            </span>
          </div>
        </div>
        <div class="ai-recomendacion" [class]="'rec-' + analisis.recomendacion">
          <span class="rec-icon">
            {{ analisis.recomendacion === 'aprobar' ? '✅' : 
               analisis.recomendacion === 'rechazar' ? '❌' : '⚠️' }}
          </span>
          <span class="rec-texto">
            {{ analisis.recomendacion === 'aprobar' ? 'IA recomienda APROBAR' :
               analisis.recomendacion === 'rechazar' ? 'IA recomienda RECHAZAR' :
               'IA recomienda REVISAR DETALLADAMENTE' }}
          </span>
        </div>
      </div>

      <div class="ai-justificacion">
        <p>{{ analisis.justificacion }}</p>
      </div>

      <div class="ai-solicitante">
        <h4>📊 Perfil del Solicitante: {{ analisis.analisisSolicitante.nombre }}</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ analisis.analisisSolicitante.rendicionesPrevias }}</span>
            <span class="stat-label">Rendiciones previas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ analisis.analisisSolicitante.tasaAprobacion }}%</span>
            <span class="stat-label">Tasa de aprobación</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ analisis.analisisSolicitante.antiguedadMeses }}</span>
            <span class="stat-label">Meses en el sistema</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ analisis.analisisSolicitante.montoPromedio | number:'1.0-0' }}</span>
            <span class="stat-label">Monto promedio (Bs.)</span>
          </div>
        </div>
      </div>

      <div class="ai-montos">
        <h4>💰 Análisis de Montos</h4>
        <div class="monto-comparison">
          <div class="monto-item">
            <span class="monto-label">Monto actual:</span>
            <span class="monto-value actual">{{ analisis.analisisMontos.montoActual | number:'1.2-2' }} Bs.</span>
          </div>
          <div class="monto-item variacion" [class.anormal]="analisis.analisisMontos.esAnormal">
            <span class="monto-label">Variación vs promedio:</span>
            <span class="monto-value">
              {{ analisis.analisisMontos.variacionPorcentaje > 0 ? '+' : '' }}
              {{ analisis.analisisMontos.variacionPorcentaje }}%
              <span *ngIf="analisis.analisisMontos.esAnormal" class="anormal-badge">⚠️</span>
            </span>
          </div>
        </div>
      </div>

      <div class="ai-factores">
        <div class="factores-col positivos" *ngIf="analisis.factoresPositivos.length > 0">
          <h4>✅ Factores Positivos</h4>
          <ul>
            <li *ngFor="let factor of analisis.factoresPositivos">{{ factor }}</li>
          </ul>
        </div>
        <div class="factores-col riesgos" *ngIf="analisis.factoresRiesgo.length > 0">
          <h4>⚠️ Factores de Riesgo</h4>
          <ul>
            <li *ngFor="let factor of analisis.factoresRiesgo">{{ factor }}</li>
          </ul>
        </div>
      </div>

      <div class="ai-alertas" *ngIf="analisis.alertas.length > 0">
        <div class="alerta-item" *ngFor="let alerta of analisis.alertas">
          <span class="alerta-icon">🔔</span>
          <span class="alerta-texto">{{ alerta }}</span>
        </div>
      </div>

      <div class="ai-modo">
        <span class="modo-badge" [class.online]="analisis.modo === 'ONLINE'">
          Modo {{ analisis.modo }}
        </span>
      </div>
    </div>

    <div class="ai-loading" *ngIf="loading">
      <div class="spinner"></div>
      <span>Analizando rendición con IA...</span>
    </div>
  `,
  styles: [`
    .ai-approval-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px; margin: 16px 0; }
    .ai-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; border-radius: 8px; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .ai-header.nivel-bajo { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); }
    .ai-header.nivel-medio { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); }
    .ai-header.nivel-alto { background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%); }
    .ai-score-section { display: flex; align-items: center; gap: 16px; }
    .ai-score-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 4px solid; background: white; }
    .ai-score-circle.score-bajo { border-color: #28a745; color: #28a745; }
    .ai-score-circle.score-medio { border-color: #ffc107; color: #ffc107; }
    .ai-score-circle.score-alto { border-color: #dc3545; color: #dc3545; }
    .score-value { font-size: 28px; font-weight: 700; }
    .score-label { font-size: 11px; text-transform: uppercase; opacity: 0.8; }
    .ai-recomendacion { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; font-weight: 600; }
    .ai-recomendacion.rec-aprobar { background: #d4edda; color: #155724; }
    .ai-recomendacion.rec-rechazar { background: #f8d7da; color: #721c24; }
    .ai-recomendacion.rec-revisar { background: #fff3cd; color: #856404; }
    .ai-justificacion { padding: 16px; background: #f8f9fa; border-radius: 8px; margin-bottom: 16px; font-style: italic; color: #555; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .stat-item { display: flex; flex-direction: column; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #667eea; }
    .stat-label { font-size: 11px; color: #666; text-align: center; }
    .monto-comparison { display: flex; flex-direction: column; gap: 8px; }
    .monto-item { display: flex; justify-content: space-between; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; }
    .monto-item.variacion.anormal { background: #fff3cd; }
    .monto-value.actual { font-weight: 600; color: #667eea; }
    .anormal-badge { font-size: 11px; margin-left: 8px; }
    .ai-factores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .factores-col { padding: 12px; border-radius: 8px; }
    .factores-col.positivos { background: #d4edda; }
    .factores-col.riesgos { background: #fff3cd; }
    .factores-col h4 { margin-bottom: 8px; font-size: 13px; }
    .factores-col ul { margin: 0; padding-left: 16px; font-size: 12px; }
    .ai-alertas { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .alerta-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 0 6px 6px 0; font-size: 13px; }
    .modo-badge { font-size: 11px; padding: 4px 8px; border-radius: 12px; background: #e9ecef; color: #666; }
    .modo-badge.online { background: #d4edda; color: #155724; }
    .ai-loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; color: #666; }
    .spinner { width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .ai-factores { grid-template-columns: 1fr; } }
  `]
})
export class AiApprovalAnalysisComponent {
  @Input() analisis: AnalisisAprobacionResult | null = null;
  @Input() loading = false;
}
