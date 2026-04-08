import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, of, takeUntil } from 'rxjs';
import { SapService, EmpleadoDto } from '../../services/sap.service';

export interface Empleado {
  cardCode: string;
  cardName: string;
}

/**
 * EmpleadoSearchComponent — selector de empleados estilo modal-buscador.
 * Carga todos los empleados de una vez y filtra localmente (patrón proveedor-search).
 *
 * Uso:
 *   <app-empleado-search
 *     [car]="perfilEmpCar"
 *     [filtro]="perfilFiltroEmpleado"
 *     [initialCode]="form.get('empleado')?.value"
 *     [initialName]="form.get('nombreEmpleado')?.value"
 *     (empleadoChange)="onEmpleadoSelected($event)">
 *   </app-empleado-search>
 *
 * Valores de `car` (U_EMP_CAR del perfil):
 *   - 'EMPIEZA'  → trae BusinessPartners cuyo CardCode empieza con `filtro`
 *   - 'TERMINA'  → trae BusinessPartners cuyo CardCode termina con `filtro`
 *   - 'NOTIENE'  → no consulta SAP, muestra lista vacía
 */
@Component({
  selector: 'app-empleado-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }

    /* ── Trigger ── */
    .es-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 0 14px; height: 40px;
      border: 1.5px dashed var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface); cursor: pointer;
      font-family: var(--font-body); font-size: var(--text-md);
      font-weight: var(--weight-medium); color: var(--text-body);
      width: 100%; text-align: left;
      transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;

      &:hover:not(:disabled) {
        border-color: var(--color-primary); border-style: solid;
        background: var(--color-primary-bg);
      }
      &:focus-visible {
        outline: none; border-style: solid;
        border-color: var(--border-focus); box-shadow: var(--shadow-focus);
      }
      &.has-value {
        border-style: solid; border-color: var(--border-color);
        &:hover { border-color: var(--color-primary); }
      }
      &.es-trigger--placeholder { color: var(--text-faint); }
      &.es-trigger--invalid { border-color: var(--color-danger); }
      &:disabled { cursor: not-allowed; opacity: 0.6; background: var(--bg-subtle); }
    }

    .es-trigger-left { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; overflow: hidden; }
    .es-trigger-code { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-primary-text); }
    .es-trigger-name { font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .es-placeholder  { color: var(--text-faint); font-weight: var(--weight-regular); }

    .es-trigger-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .es-clear { background: none; border: none; color: var(--text-faint); cursor: pointer;
      padding: 2px 4px; font-size: 11px; border-radius: var(--radius-xs);
      &:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
    .es-chevron { font-size: 9px; color: var(--text-faint); opacity: 0.7; }

    /* ── Modal ── */
    .es-backdrop {
      position: fixed; inset: 0; background: var(--bg-overlay);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: esFadeIn 0.15s ease;
    }
    @keyframes esFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .es-modal {
      background: var(--bg-surface); border: 1.5px solid var(--border-color);
      border-radius: var(--radius-xl); box-shadow: var(--shadow-modal);
      width: min(600px, 96vw); max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: esSlideIn 0.22s cubic-bezier(0.34,1.3,0.64,1);
    }
    @keyframes esSlideIn {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .es-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid var(--border-soft);
      flex-shrink: 0; background: var(--bg-faint);
      h3 { margin: 0; font-size: var(--text-base); font-weight: var(--weight-bold);
           color: var(--text-heading); display: flex; align-items: center; gap: 8px; }
    }
    .es-close { background: none; border: none; font-size: 16px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); } }

    .es-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .es-search-wrap { position: relative; display: flex; align-items: center; }
    .es-search-icon { position: absolute; left: 12px; font-size: 14px; color: var(--text-faint); pointer-events: none; }
    .es-search-input {
      width: 100%; padding: 9px 36px 9px 36px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-md);
      font-size: var(--text-base); color: var(--text-heading);
      background: var(--bg-subtle); font-family: var(--font-body);
      transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--border-focus); background: var(--bg-surface); box-shadow: var(--shadow-focus); }
    }
    .es-search-clear { position: absolute; right: 8px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 3px 5px;
      border-radius: var(--radius-xs); font-size: 11px; line-height: 1;
      &:hover { background: var(--border-color); color: var(--text-muted); } }

    .es-count { padding: 8px 20px 0; font-size: var(--text-xs); color: var(--text-faint); flex-shrink: 0; min-height: 22px; }

    .es-body { overflow-y: auto; padding: 8px 12px; flex: 1; }

    .es-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }

    .es-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: var(--radius-md);
      cursor: pointer; border: 1px solid transparent;
      transition: background 0.1s, border-color 0.1s;
      &:hover {
        background: var(--color-primary-bg); border-color: var(--color-primary-border);
        .es-item-name { color: var(--color-primary-text); }
        .es-arrow { opacity: 1; transform: translateX(0); }
      }
    }
    .es-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .es-item-code { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold);
      color: var(--text-faint); background: var(--bg-subtle); padding: 1px 6px;
      border-radius: var(--radius-xs); width: fit-content; }
    .es-item-name { font-size: var(--text-base); font-weight: var(--weight-medium);
      color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 0.1s; }
    .es-arrow { font-size: 14px; color: var(--color-primary); opacity: 0;
      transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0; }

    .es-empty { display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px; padding: 44px 24px; text-align: center; color: var(--text-faint);
      .es-empty-icon { font-size: 28px; line-height: 1; opacity: 0.45; }
      p { margin: 0; font-size: var(--text-base); } }

    .es-footer { padding: 12px 20px; border-top: 1px solid var(--border-soft);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .es-footer-hint { font-size: var(--text-xs); color: var(--text-faint); display: flex; align-items: center; gap: 5px; }
    kbd { display: inline-flex; align-items: center; padding: 1px 5px;
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: 10px;
      color: var(--text-muted); box-shadow: 0 1px 0 var(--border-color); }
  `],
  template: `
    <!-- Trigger -->
    <button type="button" class="es-trigger" [class.has-value]="selected" [class.es-trigger--placeholder]="!selected"
      [class.es-trigger--invalid]="invalid" [disabled]="disabled || car === 'NOTIENE' || !filtro" (click)="open()">
      <ng-container *ngIf="selected; else placeholderTpl">
        <div class="es-trigger-left">
          <span class="es-trigger-code">{{ selected.cardCode }}</span>
          <span class="es-trigger-name">{{ selected.cardName }}</span>
        </div>
      </ng-container>
      <ng-template #placeholderTpl>
        <span class="es-placeholder">{{ placeholder_text }}</span>
      </ng-template>
      <span class="es-trigger-right">
        <button *ngIf="selected" type="button" class="es-clear"
          (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
        <span class="es-chevron">▼</span>
      </span>
    </button>

    <!-- Modal -->
    <div class="es-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="es-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="es-header">
          <h3>👤 Buscar Empleado</h3>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="es-close" (click)="reloadAll()" title="Recargar empleados">🔄</button>
            <button type="button" class="es-close" (click)="close()">✕</button>
          </div>
        </div>

        <div class="es-search-bar">
          <div class="es-search-wrap">
            <span class="es-search-icon">⌕</span>
            <input type="text" class="es-search-input"
              placeholder="Buscar por código o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="es-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="es-count">
          <span *ngIf="loading && !loaded">Cargando empleados desde SAP...</span>
          <span *ngIf="loading && loaded">Actualizando...</span>
          <span *ngIf="!loading">{{ resultados.length }} resultado{{ resultados.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="es-body">

          <div class="es-empty" *ngIf="loading && !loaded"><span class="es-empty-icon">⏳</span><p>Cargando empleados...</p></div>

          <div class="es-empty" *ngIf="!loading && resultados.length === 0">
            <span class="es-empty-icon">🔎</span>
            <p>Sin resultados</p>
          </div>

          <ul class="es-list" *ngIf="!loading && resultados.length > 0">
            <li class="es-item" *ngFor="let e of resultados" (click)="select(e)">
              <div class="es-item-info">
                <span class="es-item-code">{{ e.cardCode }}</span>
                <span class="es-item-name">{{ e.cardName }}</span>
              </div>
              <span class="es-arrow">→</span>
            </li>
          </ul>

        </div>

        <div class="es-footer">
          <span class="es-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="close()">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class EmpleadoSearchComponent implements OnInit, OnDestroy, OnChanges {

  /** Característica del perfil (U_EMP_CAR): 'EMPIEZA' | 'TERMINA' | 'NOTIENE' */
  @Input() car:          string = 'EMPIEZA';
  /** Texto del filtro del perfil (U_EMP_TEXTO), p.ej. 'EL' */
  @Input() filtro:       string = '';
  @Input() placeholder_text    = '— Buscar y seleccionar empleado —';
  @Input() initialCode:  string | null = null;
  @Input() initialName:  string | null = null;
  @Input() invalid      = false;
  @Input() disabled     = false;

  @Output() empleadoChange = new EventEmitter<Empleado | null>();

  isOpen     = false;
  loading    = false;
  loaded     = false;
  searchTerm = '';
  resultados: Empleado[] = [];
  allItems:   Empleado[] = [];
  selected:   Empleado | null = null;

  private destroy$ = new Subject<void>();
  private sap = inject(SapService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // Pre-seleccionar si viene initialCode
    if (this.initialCode) {
      this.selected = {
        cardCode: this.initialCode,
        cardName: this.initialName ?? ''
      };
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialCode'] || changes['initialName']) {
      if (this.initialCode) {
        this.selected = {
          cardCode: this.initialCode,
          cardName: this.initialName ?? ''
        };
      } else {
        this.selected = null;
      }
      this.cdr.markForCheck();
    }

    // Si cambia el filtro o car, resetear
    if ((changes['filtro'] || changes['car']) && !changes['filtro']?.firstChange && !changes['car']?.firstChange) {
      this.loaded = false;
      this.allItems = [];
      this.resultados = [];
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isOpen) this.close(); }

  open() {
    if (!this.filtro || this.car === 'NOTIENE') return;
    this.isOpen = true;
    this.searchTerm = '';
    this.cdr.markForCheck();
    if (!this.loaded) {
      this.loadAll();
    } else {
      this.filterLocal('');
    }
  }

  reloadAll() {
    this.loaded = false;
    this.allItems = [];
    this.resultados = [];
    this.loadAll();
  }

  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    if (this.loaded) {
      this.filterLocal(term);
    }
  }

  private loadAll() {
    this.loading = true;
    this.cdr.markForCheck();

    this.sap.getEmpleadosAll({ car: this.car, filtro: this.filtro })
      .pipe(
        catchError(() => of([])),
        takeUntil(this.destroy$),
      )
      .subscribe(empleados => {
        // Eliminar duplicados por código
        const map = new Map<string, Empleado>();
        empleados.forEach(e => {
          if (!map.has(e.cardCode)) {
            map.set(e.cardCode, { cardCode: e.cardCode, cardName: e.cardName });
          }
        });

        this.allItems = Array.from(map.values());

        // Si hay un empleado seleccionado solo con código (sin nombre), buscar y completar
        if (this.selected?.cardCode && (!this.selected.cardName || this.selected.cardName === '')) {
          const found = this.allItems.find(e => e.cardCode === this.selected!.cardCode);
          if (found) {
            this.selected = { ...found };
          }
        }

        this.loaded = true;
        this.filterLocal(this.searchTerm);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  private filterLocal(term: string) {
    const q = term.toLowerCase().trim();
    if (!q) {
      this.resultados = [...this.allItems];
    } else {
      this.resultados = this.allItems.filter(e =>
        e.cardCode.toLowerCase().includes(q) ||
        e.cardName.toLowerCase().includes(q),
      );
    }
    this.cdr.markForCheck();
  }

  select(e: Empleado) {
    this.selected = e;
    this.isOpen = false;
    this.empleadoChange.emit(e);
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.empleadoChange.emit(null);
    this.cdr.markForCheck();
  }

  /** Permite resetear desde fuera (cuando cambia el perfil) */
  reset() {
    this.selected = null;
    this.allItems = [];
    this.resultados = [];
    this.loaded = false;
    this.searchTerm = '';
    this.cdr.markForCheck();
  }
}
