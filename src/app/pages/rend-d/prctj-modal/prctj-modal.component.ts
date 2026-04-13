import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { PrctjService }              from '../prctj.service';
import { ConfirmDialogComponent, ConfirmDialogConfig } from '../../../core/confirm-dialog/confirm-dialog.component';
import { SapService, DimensionWithRules } from '../../../services/sap.service';
import { CuentaSearchComponent }     from '../../../shared/cuenta-search/cuenta-search.component';
import { FormModalComponent } from '../../../shared/form-modal';
import { RendD }                     from '../../../models/rend-d.model';
import { PrctjLineaForm }            from '../../../models/prctj.model';

@Component({
  standalone: true,
  selector:   'app-prctj-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CuentaSearchComponent, ConfirmDialogComponent, FormModalComponent],
  template: `
<app-form-modal
  [title]="'Distribución porcentual'"
  [subtitle]="doc ? 'Línea ' + doc.U_RD_IdRD + ' — ' + doc.U_RD_Concepto + ' (' + (importeBase | number:'1.2-2') + ' Bs)' : null"
  [isOpen]="true"
  [loading]="isSaving"
  [isEditing]="tieneDistribucion"
  [wide]="true"
  [submitDisabled]="!puedeGuardar"
  (save)="guardar()"
  (cancel)="cancel()">
  
  <ng-template #formContent>
    <!-- Info de ayuda -->
    <div class="prctj-help">
      <span class="help-icon">ℹ</span>
      Dividí el gasto entre varios centros de costo. Los porcentajes deben sumar exactamente 100%.
    </div>

    <!-- Validación de suma -->
    <div class="pct-summary" [class.pct-ok]="totalPct === 100" [class.pct-error]="totalPct !== 100">
      <span class="pct-label">Total:</span>
      <span class="pct-value">{{ totalPct | number:'1.2-2' }}%</span>
      <span class="pct-hint" *ngIf="totalPct !== 100">
        {{ totalPct < 100 ? 'Falta ' + (100 - totalPct | number:'1.2-2') + '%' : 'Excede ' + (totalPct - 100 | number:'1.2-2') + '%' }}
      </span>
      <span class="pct-hint ok" *ngIf="totalPct === 100">✓ Correcto</span>
    </div>

    <!-- Tabla de líneas -->
    <div class="prctj-table-wrapper">
      <table class="prctj-table">
        <thead>
          <tr>
            <th class="col-pct">%</th>
            <th class="col-monto">Monto</th>
            <th class="col-cuenta">Cuenta</th>
            <ng-container *ngFor="let dim of dimensiones">
              <th class="col-dim">{{ dim.dimensionName }}</th>
            </ng-container>
            <th *ngIf="dimensiones.length === 0" class="col-dim">Centro de costo</th>
            <th class="col-proyecto">Proyecto</th>
            <th class="col-del"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let l of lineas; let i = index" [class.row-error]="l.porcentaje <= 0 || !l.cuenta">
            <!-- Porcentaje -->
            <td class="col-pct">
              <input type="number" class="input-pct"
                [(ngModel)]="l.porcentaje"
                (ngModelChange)="recalcular(i)"
                min="0.01" max="100" step="0.01"
                placeholder="0" />
            </td>
            <!-- Monto calculado -->
            <td class="col-monto mono">
              {{ calcMonto(l.porcentaje) | number:'1.2-2' }}
            </td>
            <!-- Cuenta -->
            <td class="col-cuenta">
              <app-cuenta-search
                [initialCode]="l.cuenta"
                [initialName]="l.nomCuenta"
                (cuentaChange)="onCuentaChange(i, $event)">
              </app-cuenta-search>
            </td>
            <!-- Dimensiones dinámicas -->
            <ng-container *ngFor="let dim of dimensiones; let di = index">
              <td class="col-dim">
                <select class="input-select"
                  [ngModel]="getDimValue(l, di)"
                  (ngModelChange)="setDimValue(i, di, $event)">
                  <option value="">— —</option>
                  <option *ngFor="let r of dim.rules" [value]="r.factorCode">
                    {{ r.factorCode }} - {{ r.factorDescription }}
                  </option>
                </select>
              </td>
            </ng-container>
            <td *ngIf="dimensiones.length === 0" class="col-dim">
              <input type="text" class="input-text" [(ngModel)]="l.n1" placeholder="CC" maxlength="100" />
            </td>
            <!-- Proyecto -->
            <td class="col-proyecto">
              <input type="text" class="input-text" [(ngModel)]="l.proyecto" placeholder="Proyecto" maxlength="100" />
            </td>
            <!-- Eliminar -->
            <td class="col-del">
              <button type="button" class="btn-del" title="Eliminar línea" (click)="removeLinea(i)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </td>
          </tr>

          <!-- Fila vacía si no hay líneas -->
          <tr *ngIf="lineas.length === 0">
            <td colspan="10" class="empty-row">No hay líneas — agregá al menos una.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Botón agregar -->
    <button type="button" class="btn-add-linea" (click)="addLinea()">
      + Agregar línea
    </button>
  </ng-template>
  
  <ng-template #formFooter>
    <div class="footer-left">
      <button type="button" class="btn btn-ghost btn-sm"
        *ngIf="tieneDistribucion"
        title="Eliminar toda la distribución"
        (click)="eliminarTodo()">
        🗑 Quitar distribución
      </button>
    </div>
    <div class="footer-right">
      <button type="button" class="btn btn-ghost" (click)="cancel()">Cancelar</button>
      <button type="button" class="btn btn-primary"
        [disabled]="!puedeGuardar || isSaving"
        (click)="guardar()">
        {{ isSaving ? 'Guardando...' : 'Guardar distribución' }}
      </button>
    </div>
  </ng-template>
</app-form-modal>

<!-- Confirm dialog: quitar distribucion -->
<app-confirm-dialog
  [config]="dialogConfig"
  [visible]="showDialog"
  (confirmed)="onDialogConfirm()"
  (cancelled)="onDialogCancel()">
</app-confirm-dialog>
  `,
  styles: [`
    .prctj-card {
      max-width: 900px;
      max-height: 88vh;
    }
    .modal-footer {
      justify-content: space-between;
    }
    .footer-right { display: flex; gap: 8px; }

    /* Ayuda */
    .prctj-help {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: var(--radius-md);
      background: var(--bg-info);
      color: var(--text-info);
      font-size: 13px; margin-bottom: 12px;
    }
    .help-icon { font-size: 16px; }

    /* Resumen porcentaje */
    .pct-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: var(--radius-md);
      border: 1px solid var(--border-soft);
      font-size: 13px; margin-bottom: 12px;
    }
    .pct-summary.pct-ok  { border-color: var(--color-success); background: var(--bg-success); }
    .pct-summary.pct-error { border-color: var(--color-danger);  background: var(--bg-danger); }
    .pct-label { color: var(--text-muted); }
    .pct-value { font-weight: 500; font-size: 15px; }
    .pct-hint  { color: var(--text-danger); font-size: 12px; }
    .pct-hint.ok { color: var(--text-success); }

    /* Tabla */
    .prctj-table-wrapper { overflow-x: auto; }
    .prctj-table {
      width: 100%; border-collapse: collapse; font-size: 13px;
    }
    .prctj-table th {
      padding: 8px 8px; text-align: left; font-weight: 500;
      background: var(--bg-faint);
      border-bottom: 0.5px solid var(--color-border-tertiary);
      white-space: nowrap;
    }
    .prctj-table td { padding: 6px 8px; border-bottom: 0.5px solid var(--color-border-tertiary); vertical-align: middle; }
    .prctj-table tr.row-error td { background: var(--bg-danger); }

    .col-pct     { width: 70px;  }
    .col-monto   { width: 100px; }
    .col-cuenta  { width: 200px; }
    .col-dim     { width: 140px; }
    .col-proyecto{ width: 120px; }
    .col-del     { width: 36px;  }

    .input-pct {
      width: 60px; padding: 4px 6px; font-size: 13px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-body);
      text-align: right;
    }
    .input-text, .input-select {
      width: 100%; padding: 4px 6px; font-size: 13px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-body);
    }
    .mono { font-family: var(--font-mono, monospace); font-size: 12px; text-align: right; color: var(--text-muted); }
    .empty-row { text-align: center; color: var(--text-muted); padding: 20px; }

    .btn-del {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: var(--radius-md);
      border: none; background: none; cursor: pointer;
      color: var(--text-danger);
      &:hover { background: var(--bg-danger); }
    }

    .btn-add-linea {
      margin-top: 10px;
      background: none; border: 0.5px dashed var(--color-border-tertiary);
      border-radius: var(--radius-md);
      padding: 8px 16px; font-size: 13px;
      color: var(--text-muted); cursor: pointer; width: 100%;
      &:hover { background: var(--bg-faint); color: var(--text-body); }
    }

    /* Botones */
    .btn { padding: 8px 16px; border-radius: var(--radius-md); font-size: 14px; cursor: pointer; border: 0.5px solid var(--color-border-secondary); background: none; color: var(--text-body); }
    .btn-primary { background: var(--color-primary, #7f77dd); color: #fff; border-color: transparent; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    .btn-ghost { &:hover { background: var(--bg-faint); } }
    .btn-ghost.btn-sm { padding: 6px 12px; font-size: 13px; color: var(--text-danger); }

    .modal-subtitle {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Responsive móvil */
    @media (max-width: 640px) {
      .prctj-card { max-height: 95vh; }
      .col-proyecto, .col-dim { display: none; }
    }
  `],
})
export class PrctjModalComponent implements OnInit, OnChanges {
  @Input()  doc!:       RendD;                       // línea REND_D que se distribuye
  @Input()  idRendicion!: number;
  @Input()  canEdit     = true;                      // false → solo lectura
  @Output() saved       = new EventEmitter<void>();  // distribución guardada
  @Output() cancelled   = new EventEmitter<void>();

  private prctjSvc = inject(PrctjService);
  private sapSvc   = inject(SapService);
  private cdr      = inject(ChangeDetectorRef);

  dimensiones: DimensionWithRules[] = [];

  // Diálogo de confirmación (quitar distribución)
  showDialog    = false;
  dialogConfig: ConfirmDialogConfig = { title: '', message: '', type: 'danger' };
  private _dialogCallback: (() => void) | null = null;

  openDialog(cfg: ConfirmDialogConfig, cb: () => void) {
    this.dialogConfig = cfg;
    this._dialogCallback = cb;
    this.showDialog = true;
    this.cdr.markForCheck();
  }
  onDialogConfirm() { this.showDialog = false; this._dialogCallback?.(); this.cdr.markForCheck(); }
  onDialogCancel()  { this.showDialog = false; this.cdr.markForCheck(); }
  lineas:      PrctjLineaForm[]     = [];
  loading      = false;
  isSaving     = false;
  tieneDistribucion = false;

  get importeBase(): number {
    // Siempre el importe ingresado por el usuario — sobre ese monto se distribuye.
    // El cálculo de retenciones e impuestos se aplica al total después, sin cambios.
    return this.doc?.U_RD_Importe ?? 0;
  }

  get totalPct(): number {
    return Math.round(this.lineas.reduce((s, l) => s + (Number(l.porcentaje) || 0), 0) * 100) / 100;
  }

  get puedeGuardar(): boolean {
    return this.canEdit &&
      this.lineas.length > 0 &&
      this.totalPct === 100 &&
      this.lineas.every(l => l.porcentaje > 0 && !!l.cuenta?.trim());
  }

  ngOnInit() {
    this.loadDimensiones();
    this.loadDistribucion();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['doc'] && !changes['doc'].firstChange) {
      this.loadDistribucion();
    }
  }

  private loadDimensiones() {
    this.sapSvc.getDimensions().pipe(catchError(() => of([]))).subscribe({
      next: (dims) => {
        this.dimensiones = dims.slice(0, 5);
        this.cdr.markForCheck();
      },
    });
  }

  private loadDistribucion() {
    if (!this.doc || !this.idRendicion) return;
    this.loading = true;
    this.cdr.markForCheck();

    this.prctjSvc.getAll(this.idRendicion, this.doc.U_RD_IdRD).subscribe({
      next: (rows) => {
        this.tieneDistribucion = rows.length > 0;
        this.lineas = rows.map(r => ({
          linea:      r.PRCT_IDLINEA,
          porcentaje: r.PRCT_PORCENTAJE,
          cuenta:     r.PRCT_RD_CUENTA,
          nomCuenta:  r.PRCT_RD_NOMCUENTA,
          n1:         r.PRCT_RD_N1,
          n2:         r.PRCT_RD_N2,
          n3:         r.PRCT_RD_N3,
          n4:         r.PRCT_RD_N4,
          n5:         r.PRCT_RD_N5,
          proyecto:   r.PRCT_RD_PROYECTO,
          auxiliar1:  r.PRCT_RD_AUXILIAR1,
          auxiliar2:  r.PRCT_RD_AUXILIAR2,
          auxiliar3:  r.PRCT_RD_AUXILIAR3,
          auxiliar4:  r.PRCT_RD_AUXILIAR4,
        }));
        // Si no hay distribución, crear una línea vacía por defecto con 100%
        if (this.lineas.length === 0) {
          this.addLinea(100);
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.addLinea(100);
        this.cdr.markForCheck();
      },
    });
  }

  /** Acceso seguro a dimensión N1-N5 por índice (0=n1, 1=n2, ...) */
  getDimValue(l: PrctjLineaForm, di: number): string {
    const keys: (keyof PrctjLineaForm)[] = ['n1','n2','n3','n4','n5'];
    return (l[keys[di]] as string) ?? '';
  }

  setDimValue(lineaIdx: number, di: number, value: string) {
    const keys: (keyof PrctjLineaForm)[] = ['n1','n2','n3','n4','n5'];
    const key = keys[di];
    (this.lineas[lineaIdx] as any)[key] = value;
    this.lineas = [...this.lineas];
    this.cdr.markForCheck();
  }

  addLinea(pct = 0) {
    const linea: PrctjLineaForm = {
      linea:      this.lineas.length + 1,
      porcentaje: pct,
      cuenta:     this.doc?.U_RD_Cuenta  ?? '',
      nomCuenta:  this.doc?.U_RD_NombreCuenta ?? '',
      n1:         this.doc?.U_RD_N1 ?? '',
      n2:         this.doc?.U_RD_N2 ?? '',
      n3:         this.doc?.U_RD_N3 ?? '',
      n4:         this.doc?.U_RD_N4 ?? '',
      n5:         this.doc?.U_RD_N5 ?? '',
      proyecto:   this.doc?.U_RD_Proyecto ?? '',
      auxiliar1: '', auxiliar2: '', auxiliar3: '', auxiliar4: '',
    };
    this.lineas = [...this.lineas, linea];
    this.cdr.markForCheck();
  }

  removeLinea(idx: number) {
    this.lineas = this.lineas.filter((_, i) => i !== idx)
      .map((l, i) => ({ ...l, linea: i + 1 }));
    this.cdr.markForCheck();
  }

  recalcular(idx: number) {
    // Actualizar línea para forzar re-render del monto
    this.lineas = [...this.lineas];
    this.cdr.markForCheck();
  }

  calcMonto(pct: number): number {
    return Math.round(this.importeBase * (Number(pct) || 0) / 100 * 100) / 100;
  }

  onCuentaChange(idx: number, cuenta: any) {
    this.lineas[idx] = {
      ...this.lineas[idx],
      cuenta:    cuenta?.code ?? '',
      nomCuenta: cuenta?.name ?? '',
    };
    this.lineas = [...this.lineas];
    this.cdr.markForCheck();
  }

  guardar() {
    if (!this.puedeGuardar) return;
    this.isSaving = true;
    this.cdr.markForCheck();

    this.prctjSvc.save(this.idRendicion, this.doc.U_RD_IdRD, { lineas: this.lineas }).subscribe({
      next: () => {
        this.isSaving = false;
        this.tieneDistribucion = true;
        this.saved.emit();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isSaving = false;
        this.cdr.markForCheck();
        alert(err?.error?.message ?? 'Error al guardar la distribución');
      },
    });
  }

  eliminarTodo() {
    this.openDialog({
      title:        'Quitar distribución',
      message:      '¿Estás seguro? Se eliminará toda la distribución porcentual de esta línea. La línea volverá a imputarse a su cuenta original.',
      confirmLabel: 'Sí, quitar',
      cancelLabel:  'Cancelar',
      type:         'danger',
    }, () => {
      this.prctjSvc.delete(this.idRendicion, this.doc.U_RD_IdRD).subscribe({
        next: () => {
          this.tieneDistribucion = false;
          this.lineas = [];
          this.addLinea(100);
          this.saved.emit();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cdr.markForCheck();
          alert(err?.error?.message ?? 'Error al eliminar la distribución');
        },
      });
    });
  }

  cancel()         { this.cancelled.emit(); }
  onBackdrop(e: MouseEvent) { this.cancel(); }
}