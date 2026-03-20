import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of, takeUntil } from 'rxjs';
import { SapService, CuentaDto } from '../../services/sap.service';

/**
 * CuentaSearchComponent — selector de cuentas contables filtrado por perfil.
 *
 * Uso:
 *   <app-cuenta-search
 *     [cueCar]="perfil.U_CUE_CAR"
 *     [cueTexto]="perfil.U_CUE_Texto"
 *     [listaCuentas]="listaCuentasPerfil"
 *     [initialCode]="form.get('cuenta')?.value"
 *     (cuentaChange)="onCuentaSelected($event)">
 *   </app-cuenta-search>
 */
@Component({
  selector: 'app-cuenta-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }

    /* ── Trigger ── */
    .cs-trigger {
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
    }

    .cs-trigger-left { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; overflow: hidden; }
    .cs-trigger-code { font-family: var(--font-mono); font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-primary-text); }
    .cs-trigger-name { font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cs-placeholder  { color: var(--text-faint); font-weight: var(--weight-regular); }

    .cs-trigger-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .cs-clear { background: none; border: none; color: var(--text-faint); cursor: pointer;
      padding: 2px 4px; font-size: 11px; border-radius: var(--radius-xs);
      &:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
    .cs-chevron { font-size: 9px; color: var(--text-faint); opacity: 0.7; }

    /* ── Modal ── */
    .cs-backdrop {
      position: fixed; inset: 0; background: var(--bg-overlay);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: csFadeIn 0.15s ease;
    }
    @keyframes csFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .cs-modal {
      background: var(--bg-surface); border: 1.5px solid var(--border-color);
      border-radius: var(--radius-xl); box-shadow: var(--shadow-modal);
      width: min(600px, 96vw); max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: csSlideIn 0.22s cubic-bezier(0.34,1.3,0.64,1);
    }
    @keyframes csSlideIn {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .cs-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid var(--border-soft);
      flex-shrink: 0; background: var(--bg-faint);
      h3 { margin: 0; font-size: var(--text-base); font-weight: var(--weight-bold);
           color: var(--text-heading); display: flex; align-items: center; gap: 8px; }
    }
    .cs-close { background: none; border: none; font-size: 16px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); } }

    .cs-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .cs-search-wrap { position: relative; display: flex; align-items: center; }
    .cs-search-icon { position: absolute; left: 12px; font-size: 14px; color: var(--text-faint); pointer-events: none; }
    .cs-search-input {
      width: 100%; padding: 9px 36px 9px 36px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-md);
      font-size: var(--text-base); color: var(--text-heading);
      background: var(--bg-subtle); font-family: var(--font-body);
      transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--border-focus); background: var(--bg-surface); box-shadow: var(--shadow-focus); }
    }
    .cs-search-clear { position: absolute; right: 8px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 3px 5px;
      border-radius: var(--radius-xs); font-size: 11px; line-height: 1;
      &:hover { background: var(--border-color); color: var(--text-muted); } }

    .cs-count { padding: 8px 20px 0; font-size: var(--text-xs); color: var(--text-faint); flex-shrink: 0; min-height: 22px; }

    .cs-body { overflow-y: auto; padding: 8px 12px; flex: 1; }

    .cs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }

    .cs-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: var(--radius-md);
      cursor: pointer; border: 1px solid transparent;
      transition: background 0.1s, border-color 0.1s;
      &:hover {
        background: var(--color-primary-bg); border-color: var(--color-primary-border);
        .cs-item-name { color: var(--color-primary-text); }
        .cs-arrow { opacity: 1; transform: translateX(0); }
      }
    }
    .cs-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .cs-item-code { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold);
      color: var(--text-faint); background: var(--bg-subtle); padding: 1px 6px;
      border-radius: var(--radius-xs); width: fit-content; }
    .cs-item-name { font-size: var(--text-base); font-weight: var(--weight-medium);
      color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: color 0.1s; }
    .cs-arrow { font-size: 14px; color: var(--color-primary); opacity: 0;
      transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0; }

    .cs-empty { display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 8px; padding: 44px 24px; text-align: center; color: var(--text-faint);
      .cs-empty-icon { font-size: 28px; line-height: 1; opacity: 0.45; }
      p { margin: 0; font-size: var(--text-base); } }

    .cs-footer { padding: 12px 20px; border-top: 1px solid var(--border-soft);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .cs-footer-hint { font-size: var(--text-xs); color: var(--text-faint); display: flex; align-items: center; gap: 5px; }
    kbd { display: inline-flex; align-items: center; padding: 1px 5px;
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: 10px;
      color: var(--text-muted); box-shadow: 0 1px 0 var(--border-color); }
  `],
  template: `
    <!-- Trigger -->
    <button type="button" class="cs-trigger" [class.has-value]="selected" (click)="open()">
      <ng-container *ngIf="selected; else placeholderTpl">
        <div class="cs-trigger-left">
          <span class="cs-trigger-code">{{ selected.code }}</span>
          <span class="cs-trigger-name">{{ selected.name }}</span>
        </div>
      </ng-container>
      <ng-template #placeholderTpl>
        <span class="cs-placeholder">{{ placeholder }}</span>
      </ng-template>
      <span class="cs-trigger-right">
        <button *ngIf="selected" type="button" class="cs-clear"
          (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
        <span class="cs-chevron">▼</span>
      </span>
    </button>

    <!-- Modal -->
    <div class="cs-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="cs-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="cs-header">
          <h3>📒 Buscar Cuenta Contable</h3>
          <button type="button" class="cs-close" (click)="close()">✕</button>
        </div>

        <div class="cs-search-bar">
          <div class="cs-search-wrap">
            <span class="cs-search-icon">⌕</span>
            <input type="text" class="cs-search-input"
              placeholder="Buscar por código o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="cs-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="cs-count">
          <span *ngIf="loading">Buscando cuentas...</span>
          <span *ngIf="!loading && searchTerm">
            {{ resultados.length }} resultado{{ resultados.length !== 1 ? 's' : '' }}
          </span>
          <span *ngIf="!loading && !searchTerm">Escribe para buscar cuentas</span>
        </div>

        <div class="cs-body">

          <div class="cs-empty" *ngIf="loading">
            <span class="cs-empty-icon">⏳</span>
            <p>Buscando...</p>
          </div>

          <div class="cs-empty" *ngIf="!loading && resultados.length === 0 && searchTerm">
            <span class="cs-empty-icon">🔎</span>
            <p>Sin resultados para "<strong>{{ searchTerm }}</strong>"</p>
          </div>

          <div class="cs-empty" *ngIf="!loading && !searchTerm">
            <span class="cs-empty-icon">📒</span>
            <p>Escribe el código o nombre de la cuenta</p>
          </div>

          <ul class="cs-list" *ngIf="!loading && resultados.length > 0">
            <li class="cs-item" *ngFor="let c of resultados" (click)="select(c)">
              <div class="cs-item-info">
                <span class="cs-item-code">{{ c.code }}</span>
                <span class="cs-item-name">{{ c.name }}</span>
              </div>
              <span class="cs-arrow">→</span>
            </li>
          </ul>

        </div>

        <div class="cs-footer">
          <span class="cs-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="close()">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class CuentaSearchComponent implements OnInit, OnDestroy, OnChanges {

  @Input() placeholder   = '— Buscar y seleccionar cuenta —';
  @Input() initialCode:  string | null = null;
  @Input() cueCar:       string = 'TODOS';
  @Input() cueTexto:     string = '';
  @Input() listaCuentas: CuentaDto[] = [];

  /** Emite { code, name } al seleccionar, null al limpiar */
  @Output() cuentaChange = new EventEmitter<CuentaDto | null>();

  /** @deprecated mantener compatibilidad con código existente */
  @Output() accountChange = new EventEmitter<any>();

  isOpen     = false;
  loading    = false;
  searchTerm = '';
  resultados: CuentaDto[] = [];
  selected:   CuentaDto | null = null;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private sap = inject(SapService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(busqueda => {
        this.loading = true;
        this.cdr.markForCheck();
        return this.sap.getCuentas({
          cueCar:      this.cueCar,
          cueTexto:    this.cueTexto,
          busqueda,
          listaCuentas: this.listaCuentas,
        }).pipe(catchError(() => of([])));
      }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.resultados = res;
      this.loading    = false;
      this.cdr.markForCheck();
    });

    // Pre-seleccionar si viene initialCode
    if (this.initialCode) {
      this.selected = { code: this.initialCode, name: '' };
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialCode']) {
      this.selected = this.initialCode
        ? { code: this.initialCode, name: '' }
        : null;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  open() {
    this.isOpen    = true;
    this.searchTerm = '';
    this.resultados = [];
    this.cdr.markForCheck();
  }

  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    if (term.length >= 1) {
      this.search$.next(term);
    } else {
      this.resultados = [];
      this.loading    = false;
      this.cdr.markForCheck();
    }
  }

  select(c: CuentaDto) {
    this.selected = c;
    this.isOpen   = false;
    this.cuentaChange.emit(c);
    this.accountChange.emit(c); // compatibilidad
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.cuentaChange.emit(null);
    this.accountChange.emit(null);
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }
}