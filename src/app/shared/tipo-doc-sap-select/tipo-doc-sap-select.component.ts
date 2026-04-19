import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, ChangeDetectionStrategy,
  ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '@env';

export interface TipoDocSapItem {
  U_IdTipo:    number;
  U_Nombre:    string;
  U_EsTipoF:   string; // 'F' | 'R'
  U_PermiteGU: string; // 'Y' | 'N'
  U_PermiteGD: string; // 'Y' | 'N'
}

/**
 * Selector de Tipo de Documento SAP — carga desde /api/v1/tipo-doc-sap/activos.
 *
 * Uso:
 *   <app-tipo-doc-sap-select
 *     [value]="form.get('idTipoDoc')?.value"
 *     [invalid]="!!form.get('idTipoDoc')?.invalid && !!form.get('idTipoDoc')?.touched"
 *     (valueChange)="onTipoDocChange($event)">
 *   </app-tipo-doc-sap-select>
 */
@Component({
  selector:        'app-tipo-doc-sap-select',
  standalone:      true,
  imports:         [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Trigger ──────────────────────────────────────────── */
    .tds-trigger {
      display:         flex;
      align-items:     center;
      justify-content: space-between;
      gap:             8px;
      padding:         8px 12px;
      min-height:      38px;
      border:          1px solid var(--border-color);
      border-radius:   var(--radius-md, 6px);
      background:      var(--bg-surface);
      cursor:          pointer;
      transition:      border-color 0.15s, box-shadow 0.15s;
      font-family:     inherit;
      font-size:       0.875rem;
      color:           var(--text-body);
      width:           100%;
      text-align:      left;
    }
    .tds-trigger:hover       { border-color: var(--color-primary); }
    .tds-trigger:focus-visible {
      outline:      none;
      border-color: var(--color-primary);
      box-shadow:   var(--focus-ring);
    }
    .tds-trigger--invalid    { border-color: var(--color-danger); }
    .tds-trigger--placeholder { color: var(--text-faint); }

    .tds-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .tds-trigger-id   {
      font-family:  var(--font-mono);
      font-size:    12px;
      font-weight:  700;
      color:        var(--color-primary);
    }
    .tds-trigger-nombre {
      font-size:     0.875rem;
      color:         var(--text-body);
      font-weight:   500;
    }
    .tds-trigger-icons { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .tds-clear {
      background: none; border: none; color: var(--text-faint);
      cursor: pointer; padding: 0 2px; font-size: 13px; line-height: 1;
    }
    .tds-clear:hover { color: var(--color-danger); }
    .tds-chevron { font-size: 11px; color: var(--text-faint); }

    /* ── Dropdown ─────────────────────────────────────────── */
    .tds-backdrop {
      position: fixed; inset: 0; z-index: 900;
    }
    .tds-dropdown {
      position:      absolute;
      top:           calc(100% + 4px);
      left:          0;
      right:         0;
      z-index:       1000;
      background:    var(--bg-surface);
      border:        1px solid var(--border-color);
      border-radius: var(--radius-lg, 10px);
      box-shadow:    var(--shadow-modal);
      overflow:      hidden;
      animation:     tdsSlideIn 0.15s ease;
    }
    @keyframes tdsSlideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .tds-wrapper { position: relative; }

    .tds-list {
      list-style: none;
      margin: 0; padding: 4px;
      display: flex; flex-direction: column; gap: 2px;
      max-height: 260px;
      overflow-y: auto;
    }

    .tds-item {
      display:       flex;
      align-items:   center;
      gap:           10px;
      padding:       10px 12px;
      border-radius: var(--radius-md, 6px);
      cursor:        pointer;
      transition:    background 0.1s;
    }
    .tds-item:hover         { background: var(--bg-faint); }
    .tds-item--selected     { background: var(--color-primary-bg); }

    .tds-item-id {
      font-family:   var(--font-mono);
      font-size:     12px;
      font-weight:   700;
      color:         var(--color-primary);
      min-width:     28px;
      flex-shrink:   0;
    }
    .tds-item-info  { flex: 1; min-width: 0; }
    .tds-item-nombre {
      font-size:   0.875rem;
      font-weight: 500;
      color:       var(--text-heading);
    }
    .tds-item-meta {
      font-size: 11px;
      color:     var(--text-faint);
      margin-top: 2px;
    }

    .tds-badge {
      font-size:     10px;
      font-weight:   700;
      padding:       2px 7px;
      border-radius: var(--radius-pill, 20px);
      flex-shrink:   0;
    }
    .tds-badge--f {
      background: rgba(59,130,246,0.1);
      color:      #185FA5;
      border:     1px solid rgba(59,130,246,0.25);
    }
    .tds-badge--r {
      background: rgba(139,92,246,0.1);
      color:      #5B21B6;
      border:     1px solid rgba(139,92,246,0.25);
    }

    .tds-empty {
      padding: 20px 16px;
      text-align: center;
      color: var(--text-faint);
      font-size: 0.875rem;
    }
    .tds-loading { padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.875rem; }
  `],
  template: `
    <div class="tds-wrapper">

      <!-- Trigger -->
      <button
        type="button"
        [class]="'tds-trigger' +
          (selected ? '' : ' tds-trigger--placeholder') +
          (invalid   ? ' tds-trigger--invalid' : '')"
        (click)="toggle()">
        <div class="tds-trigger-main">
          <ng-container *ngIf="selected; else placeholder">
            <span class="tds-trigger-id">{{ selected.U_IdTipo }}</span>
            <span class="tds-trigger-nombre">{{ selected.U_Nombre }}</span>
          </ng-container>
          <ng-template #placeholder>
            <span>— Seleccionar tipo de documento SAP —</span>
          </ng-template>
        </div>
        <div class="tds-trigger-icons">
          <button *ngIf="selected" type="button" class="tds-clear"
            (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
          <span class="tds-chevron">{{ isOpen ? '▴' : '▾' }}</span>
        </div>
      </button>

      <!-- Backdrop para cerrar al hacer clic fuera -->
      <div class="tds-backdrop" *ngIf="isOpen" (click)="close()"></div>

      <!-- Dropdown -->
      <div class="tds-dropdown" *ngIf="isOpen">

        <div class="tds-loading" *ngIf="loading">⏳ Cargando tipos...</div>

        <div class="tds-empty" *ngIf="!loading && items.length === 0">
          No hay tipos de documento activos.<br>
          <small>Configurá tipos en Administración → Tipos Documento SAP</small>
        </div>

        <ul class="tds-list" *ngIf="!loading && items.length > 0">
          <li class="tds-item"
            *ngFor="let item of items"
            [class.tds-item--selected]="selected?.U_IdTipo === item.U_IdTipo"
            (click)="select(item)">
            <span class="tds-item-id">{{ item.U_IdTipo }}</span>
            <div class="tds-item-info">
              <div class="tds-item-nombre">{{ item.U_Nombre }}</div>
              <div class="tds-item-meta">
                {{ item.U_EsTipoF === 'F' ? 'Factura' : 'Recibo' }}
                <ng-container *ngIf="item.U_EsTipoF === 'R'">
                  <span *ngIf="item.U_PermiteGU === 'Y'"> · GU</span>
                  <span *ngIf="item.U_PermiteGD === 'Y'"> · GD</span>
                </ng-container>
              </div>
            </div>
            <span [class]="item.U_EsTipoF === 'F' ? 'tds-badge tds-badge--f' : 'tds-badge tds-badge--r'">
              {{ item.U_EsTipoF === 'F' ? 'Factura' : 'Recibo' }}
            </span>
          </li>
        </ul>

      </div>
    </div>
  `,
})
export class TipoDocSapSelectComponent implements OnInit, OnDestroy {

  @Input() set value(val: number | null | undefined) {
    this._value = val ?? null;
    this._syncSelected();
  }
  @Input() invalid = false;

  @Output() valueChange    = new EventEmitter<number | null>();
  @Output() itemChange     = new EventEmitter<TipoDocSapItem | null>();

  isOpen   = false;
  loading  = false;
  items:   TipoDocSapItem[] = [];
  selected: TipoDocSapItem | null = null;

  private _value:   number | null = null;
  private destroy$ = new Subject<void>();
  private http      = inject(HttpClient);
  private cdr       = inject(ChangeDetectorRef);

  private get api() { return `${environment.apiUrl}/tipo-doc-sap/activos`; }

  ngOnInit() {
    setTimeout(() => this.loadItems(), 0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.cdr.markForCheck();
  }

  close() {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  select(item: TipoDocSapItem) {
    this.selected = item;
    this.isOpen   = false;
    this.valueChange.emit(item.U_IdTipo);
    this.itemChange.emit(item);
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.valueChange.emit(null);
    this.itemChange.emit(null);
    this.cdr.markForCheck();
  }

  /** Etiqueta para mostrar en tablas — uso externo */
  labelFor(idTipo: number): string {
    return this.items.find(i => i.U_IdTipo === idTipo)?.U_Nombre ?? String(idTipo);
  }

  private loadItems() {
    this.loading = true;
    this.http.get<TipoDocSapItem[]>(this.api)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.items   = data;
          this.loading = false;
          this._syncSelected();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private _syncSelected() {
    if (this._value === null || !this.items.length) return;
    const found = this.items.find(i => i.U_IdTipo === this._value);
    if (found) this.selected = found;
  }
}