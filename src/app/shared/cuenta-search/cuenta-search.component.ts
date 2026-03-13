import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { SapService, ChartOfAccount } from '../../services/sap.service';

/**
 * Buscador de cuentas SAP estilo modal-buscador.
 *
 * Uso:
 *   <app-cuenta-search
 *     (accountChange)="onAccountSelected($event)">
 *   </app-cuenta-search>
 *
 * Con valor inicial (edición):
 *   <app-cuenta-search
 *     [initialCode]="form.get('cuenta')?.value"
 *     (accountChange)="onAccountSelected($event)">
 *   </app-cuenta-search>
 */
@Component({
  selector: 'app-cuenta-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Trigger ── */
    .cs-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.875rem;
      color: var(--text-body); width: 100%; text-align: left;
      &:hover { border-color: var(--color-primary); }
      &:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
      &.cs-trigger--placeholder { color: var(--text-faint); }
    }

    .cs-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }

    .cs-trigger-code { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-primary); }

    .cs-trigger-name { font-size: 12px; color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .cs-trigger-placeholder { font-size: 0.9rem; }

    .cs-trigger-icons { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

    .cs-clear-btn { background: none; border: none; color: var(--text-faint); cursor: pointer;
      padding: 0 2px; font-size: 13px; line-height: 1;
      &:hover { color: var(--color-danger); } }

    .cs-chevron { font-size: 11px; color: var(--text-faint); }

    /* ── Modal ── */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: csFadeIn 0.15s ease; }

    @keyframes csFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .cs-modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-modal);
      width: min(640px, 96vw); max-height: 82vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: csSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }

    @keyframes csSlideIn { from { opacity:0; transform: translateY(12px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }

    .cs-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
      h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-heading); }
    }

    .cs-modal-close { background: none; border: none; font-size: 18px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); } }

    .cs-search-bar { padding: 16px 24px 0; flex-shrink: 0; }

    .cs-search-wrap { position: relative; display: flex; align-items: center; }

    .cs-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }

    .cs-search-input {
      width: 100%; padding: 10px 40px 10px 42px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px);
      font-size: 14px; color: var(--text-heading); background: var(--bg-faint);
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--color-primary); background: var(--bg-surface); box-shadow: var(--focus-ring); }
    }

    .cs-search-clear { position: absolute; right: 10px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 4px 6px;
      border-radius: var(--radius-sm); font-size: 13px; line-height: 1;
      &:hover { color: var(--text-muted); background: var(--bg-subtle); } }

    .cs-count { padding: 8px 24px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }

    .cs-body { overflow-y: auto; padding: 8px 12px; }

    .cs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .cs-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: var(--radius-lg, 10px);
      cursor: pointer; transition: background 0.1s, transform 0.08s;
      border: 1px solid transparent;
      &:hover {
        background: var(--color-primary-bg);
        border-color: var(--color-primary-border, var(--border-color));
        transform: translateX(2px);
        .cs-item-name { color: var(--color-primary-text); }
        .cs-arrow { opacity: 1; transform: translateX(0); }
      }
    }

    .cs-item-icon { font-size: 18px; flex-shrink: 0; width: 28px; text-align: center; }

    .cs-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

    .cs-item-top { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }

    .cs-item-name { font-size: 14px; font-weight: 600; color: var(--text-heading);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.1s; }

    .cs-item-code { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint);
      background: var(--bg-subtle); padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }

    .cs-item-badge {
      font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; flex-shrink: 0;
      &.yes { background: var(--status-closed-bg); color: var(--status-closed-color); }
      &.no  { background: var(--bg-subtle); color: var(--text-faint); }
    }

    .cs-arrow { font-size: 16px; color: var(--color-primary); opacity: 0;
      transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0; }

    .cs-empty { display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; padding: 48px 24px; text-align: center; color: var(--text-faint); }
    .cs-empty-icon { font-size: 32px; line-height: 1; opacity: 0.5; }
    .cs-empty p { margin: 0; font-size: 14px; strong { color: var(--text-muted); } }

    .cs-footer { padding: 14px 24px; border-top: 1px solid var(--border-color);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .cs-footer-hint { font-size: 11px; color: var(--text-faint); }
    kbd { display: inline-block; padding: 1px 5px; background: var(--bg-subtle);
      border: 1px solid var(--border-color); border-radius: 4px;
      font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
  `],
  template: `
    <!-- Campo trigger -->
    <button type="button" class="cs-trigger"
      [class.cs-trigger--placeholder]="!selected"
      (click)="open()">
      <ng-container *ngIf="selected; else emptyTrigger">
        <div class="cs-trigger-main">
          <span class="cs-trigger-code">{{ selected.formatCode }}</span>
          <span class="cs-trigger-name">{{ selected.name }}</span>
        </div>
      </ng-container>
      <ng-template #emptyTrigger>
        <span class="cs-trigger-placeholder">{{ placeholder }}</span>
      </ng-template>
      <span class="cs-trigger-icons">
        <button *ngIf="selected" type="button" class="cs-clear-btn"
          (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
        <span class="cs-chevron">▼</span>
      </span>
    </button>

    <!-- Modal -->
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="cs-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="cs-header">
          <h3>🔍 Buscar Cuenta SAP</h3>
          <button type="button" class="cs-modal-close" (click)="close()">✕</button>
        </div>

        <div class="cs-search-bar">
          <div class="cs-search-wrap">
            <span class="cs-search-icon">⌕</span>
            <input type="text" class="cs-search-input"
              placeholder="Buscar por código o nombre de cuenta..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="cs-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="cs-count">
          <span *ngIf="loading">Cargando plan de cuentas SAP...</span>
          <span *ngIf="!loading && searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }} para "<strong>{{ searchTerm }}</strong>"
          </span>
          <span *ngIf="!loading && !searchTerm">
            {{ filtered.length }} cuenta{{ filtered.length !== 1 ? 's' : '' }} — escribí para filtrar
          </span>
        </div>

        <div class="cs-body">

          <div class="cs-empty" *ngIf="loading">
            <span class="cs-empty-icon">⏳</span>
            <p>Cargando plan de cuentas SAP...</p>
          </div>

          <div class="cs-empty" *ngIf="!loading && filtered.length === 0">
            <span class="cs-empty-icon">🔎</span>
            <p>No se encontraron cuentas<ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>.</p>
          </div>

          <ul class="cs-list" *ngIf="!loading && filtered.length > 0">
            <li class="cs-item" *ngFor="let a of filtered" (click)="select(a)">
              <span class="cs-item-icon">📒</span>
              <div class="cs-item-info">
                <div class="cs-item-top">
                  <span class="cs-item-name">{{ a.name }}</span>
                  <span class="cs-item-code">{{ a.formatCode }}</span>
                  <span class="cs-item-badge" [class.yes]="a.lockManual === 'tYES'" [class.no]="a.lockManual !== 'tYES'">
                    {{ a.lockManual === 'tYES' ? 'Asociada' : 'No asociada' }}
                  </span>
                </div>
              </div>
              <span class="cs-arrow">→</span>
            </li>
          </ul>

        </div>

        <div class="cs-footer">
          <span class="cs-footer-hint"><kbd>Esc</kbd> para cerrar · clic para seleccionar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="close()">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class CuentaSearchComponent implements OnInit, OnChanges, OnDestroy {
  @Input() placeholder  = '— Buscar y seleccionar cuenta —';
  @Input() initialCode: string | null = null;
  @Input() showPreview  = true;   // mantenido por compatibilidad, no usado en modal

  @Output() accountChange = new EventEmitter<ChartOfAccount | null>();

  isOpen     = false;
  loading    = false;
  searchTerm = '';
  all:      ChartOfAccount[] = [];
  filtered: ChartOfAccount[] = [];
  selected: ChartOfAccount | null = null;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  private sap = inject(SapService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // Filtrado local con debounce
    this.search$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(term => {
      const q = term.toLowerCase().trim();
      this.filtered = q
        ? this.all.filter(a =>
            a.formatCode.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.code.toLowerCase().includes(q)
          ).slice(0, 100)
        : this.all.slice(0, 100);
      this.cdr.markForCheck();
    });

    this.loading = true;
    this.sap.getChartOfAccounts().subscribe({
      next: (data) => {
        this.all      = data;
        this.filtered = data.slice(0, 100);
        this.loading  = false;
        if (this.initialCode) {
          this.selected = data.find(a => a.formatCode === this.initialCode) ?? null;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCode'] && !this.selected && this.all.length > 0) {
      this.selected = this.initialCode
        ? (this.all.find(a => a.formatCode === this.initialCode) ?? null)
        : null;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  open() {
    this.isOpen     = true;
    this.searchTerm = '';
    this.filtered   = this.all.slice(0, 100);
    this.cdr.markForCheck();
  }

  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    this.search$.next(term);
  }

  select(a: ChartOfAccount) {
    this.selected = a;
    this.isOpen   = false;
    this.accountChange.emit(a);
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.accountChange.emit(null);
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }
}
