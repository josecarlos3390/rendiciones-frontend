import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, catchError, of, takeUntil } from 'rxjs';
import { SapService, ProveedorDto } from '../../services/sap.service';
import { ProvService } from '../../services/prov.service';

@Component({
  selector: 'app-proveedor-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }

    .ps-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 0 14px; height: 40px;
      border: 1.5px dashed var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface); cursor: pointer;
      font-family: var(--font-body); font-size: var(--text-md);
      font-weight: var(--weight-medium); color: var(--text-body);
      width: 100%; text-align: left;
      transition: border-color 0.14s, background 0.14s, box-shadow 0.14s;
      &:hover { border-color: var(--color-primary); border-style: solid; background: var(--color-primary-bg); }
      &:focus-visible { outline: none; border-style: solid; border-color: var(--border-focus); box-shadow: var(--shadow-focus); }
      &.has-value { border-style: solid; border-color: var(--border-color); &:hover { border-color: var(--color-primary); } }
    }
    .ps-trigger-left { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; overflow: hidden; }
    .ps-trigger-name { font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ps-trigger-nit  { font-size: var(--text-xs); color: var(--text-faint); font-family: var(--font-mono); }
    .ps-placeholder  { color: var(--text-faint); font-weight: var(--weight-regular); }
    .ps-trigger-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .ps-clear { background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 2px 4px; font-size: 11px; border-radius: var(--radius-xs); &:hover { background: var(--color-danger-soft); color: var(--color-danger); } }
    .ps-chevron { font-size: 9px; color: var(--text-faint); opacity: 0.7; }

    .ps-backdrop { position: fixed; inset: 0; background: var(--bg-overlay); display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 24px; animation: psFadeIn 0.15s ease; }
    @keyframes psFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .ps-modal {
      background: var(--bg-surface); border: 1.5px solid var(--border-color);
      border-radius: var(--radius-xl); box-shadow: var(--shadow-modal);
      width: min(600px, 96vw); max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: psSlideIn 0.22s cubic-bezier(0.34,1.3,0.64,1);
    }
    @keyframes psSlideIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

    .ps-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid var(--border-soft); flex-shrink: 0; background: var(--bg-faint); h3 { margin: 0; font-size: var(--text-base); font-weight: var(--weight-bold); color: var(--text-heading); display: flex; align-items: center; gap: 8px; } }
    .ps-close { background: none; border: none; font-size: 16px; color: var(--text-faint); cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1; &:hover { background: var(--bg-subtle); color: var(--text-muted); } }

    .ps-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .ps-search-wrap { position: relative; display: flex; align-items: center; }
    .ps-search-icon { position: absolute; left: 12px; font-size: 14px; color: var(--text-faint); pointer-events: none; }
    .ps-search-input { width: 100%; padding: 9px 36px 9px 36px; border: 1.5px solid var(--border-color); border-radius: var(--radius-md); font-size: var(--text-base); color: var(--text-heading); background: var(--bg-subtle); font-family: var(--font-body); transition: border-color 0.14s, box-shadow 0.14s, background 0.14s; &::placeholder { color: var(--text-faint); } &:focus { outline: none; border-color: var(--border-focus); background: var(--bg-surface); box-shadow: var(--shadow-focus); } }
    .ps-search-clear { position: absolute; right: 8px; background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 3px 5px; border-radius: var(--radius-xs); font-size: 11px; line-height: 1; &:hover { background: var(--border-color); color: var(--text-muted); } }

    .ps-count { padding: 8px 20px 0; font-size: var(--text-xs); color: var(--text-faint); flex-shrink: 0; min-height: 22px; }
    .ps-body { overflow-y: auto; padding: 8px 12px; flex: 1; }
    .ps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }

    .ps-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: var(--radius-md); cursor: pointer; border: 1px solid transparent; transition: background 0.1s, border-color 0.1s;
      &:hover { background: var(--color-primary-bg); border-color: var(--color-primary-border); .ps-item-name { color: var(--color-primary-text); } .ps-arrow { opacity: 1; transform: translateX(0); } }
    }
    .ps-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .ps-item-code { font-family: var(--font-mono); font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-faint); background: var(--bg-subtle); padding: 1px 6px; border-radius: var(--radius-xs); width: fit-content; }
    .ps-item-name { font-size: var(--text-base); font-weight: var(--weight-medium); color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.1s; }
    .ps-item-nit   { font-size: var(--text-xs); color: var(--text-faint); font-family: var(--font-mono); }
    .ps-arrow { font-size: 14px; color: var(--color-primary); opacity: 0; transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0; }

    .ps-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 44px 24px; text-align: center; color: var(--text-faint); .ps-empty-icon { font-size: 28px; line-height: 1; opacity: 0.45; } p { margin: 0; font-size: var(--text-base); } }

    .ps-footer { padding: 12px 20px; border-top: 1px solid var(--border-soft); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .ps-footer-hint { font-size: var(--text-xs); color: var(--text-faint); display: flex; align-items: center; gap: 5px; }
    kbd { display: inline-flex; align-items: center; padding: 1px 5px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-xs); font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); box-shadow: 0 1px 0 var(--border-color); }
  `],
  template: `
    <button type="button" class="ps-trigger" [class.has-value]="selected" (click)="open()">
      <ng-container *ngIf="selected; else placeholderTpl">
        <div class="ps-trigger-left">
          <span class="ps-trigger-name">{{ selected.cardName }}</span>
          <span class="ps-trigger-nit" *ngIf="selected.licTradNum">NIT: {{ selected.licTradNum }}</span>
        </div>
      </ng-container>
      <ng-template #placeholderTpl>
        <span class="ps-placeholder">{{ placeholder }}</span>
      </ng-template>
      <span class="ps-trigger-right">
        <button *ngIf="selected" type="button" class="ps-clear"
          (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
        <span class="ps-chevron">▼</span>
      </span>
    </button>

    <div class="ps-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="ps-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="ps-header">
          <h3>🏢 Buscar Proveedor</h3>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="ps-close" (click)="reloadAll()" title="Recargar proveedores">🔄</button>
            <button type="button" class="ps-close" (click)="close()">✕</button>
          </div>
        </div>

        <div class="ps-search-bar">
          <div class="ps-search-wrap">
            <span class="ps-search-icon">⌕</span>
            <input type="text" class="ps-search-input"
              placeholder="Buscar por código, nombre o NIT..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="ps-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="ps-count">
          <span *ngIf="loading && !loaded">Cargando proveedores desde SAP...</span>
          <span *ngIf="loading && loaded">Actualizando...</span>
          <span *ngIf="!loading">{{ resultados.length }} resultado{{ resultados.length !== 1 ? 's' : '' }}</span>
        </div>

        <div class="ps-body">
          <div class="ps-empty" *ngIf="loading && !loaded"><span class="ps-empty-icon">⏳</span><p>Cargando proveedores...</p></div>
          <div class="ps-empty" *ngIf="!loading && resultados.length === 0">
            <span class="ps-empty-icon">🔎</span>
            <p>Sin resultados</p>
          </div>
          <ul class="ps-list" *ngIf="!loading && resultados.length > 0">
            <li class="ps-item" *ngFor="let p of resultados" (click)="select(p)">
              <div class="ps-item-info">
                <span class="ps-item-code">{{ p.cardCode }}</span>
                <span class="ps-item-name">{{ p.cardName }}</span>
                <span class="ps-item-nit" *ngIf="p.licTradNum">NIT: {{ p.licTradNum }}</span>
              </div>
              <span class="ps-arrow">→</span>
            </li>
          </ul>
        </div>

        <div class="ps-footer">
          <span class="ps-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="close()">Cancelar</button>
        </div>
      </div>
    </div>
  `,
})
export class ProveedorSearchComponent implements OnInit, OnDestroy, OnChanges {

  @Input() placeholder = '— Buscar y seleccionar proveedor —';
  @Input() proCar:    string = 'TODOS';
  @Input() proTexto:  string = '';
  @Input() initialCode: string | null = null;
  @Input() set selected(val: { cardCode: string; cardName: string; licTradNum?: string } | null) {
    this._selected = val;
    this.cdr.markForCheck();
  }
  get selected(): { cardCode: string; cardName: string; licTradNum?: string } | null { return this._selected; }
  private _selected: { cardCode: string; cardName: string; licTradNum?: string } | null = null;

  @Output() proveedorChange = new EventEmitter<ProveedorDto | null>();

  isOpen     = false;
  loading    = false;
  loaded     = false;
  searchTerm = '';
  resultados: ProveedorDto[] = [];
  allItems:   ProveedorDto[] = [];

  private destroy$ = new Subject<void>();
  private sap = inject(SapService);
  private provSvc = inject(ProvService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (this.initialCode && !this._selected) {
      this._selected = { cardCode: this.initialCode, cardName: '' };
      this.cdr.markForCheck();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialCode']) {
      if (!this._selected) {
        this._selected = this.initialCode ? { cardCode: this.initialCode, cardName: '' } : null;
        this.cdr.markForCheck();
      }
    }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  open() {
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

    forkJoin({
      sap: this.sap.getProveedoresAll({ car: this.proCar, filtro: this.proTexto }).pipe(
        catchError(() => of([])),
      ),
      prov: this.provSvc.getAll().pipe(
        catchError(() => of([])),
      ),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ sap, prov }) => {
      const provMapped: ProveedorDto[] = prov.map(p => ({
        cardCode: 'PL999999',
        cardName: p.U_RAZON_SOCIAL,
        licTradNum: p.U_NIT,
      }));

      const map = new Map<string, ProveedorDto>();
      [...provMapped, ...sap].forEach(p => {
        const key = `${p.cardCode}|${p.cardName}`;
        if (!map.has(key)) {
          map.set(key, p);
        }
      });

      this.allItems = Array.from(map.values());
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
      this.resultados = this.allItems.filter(p =>
        p.cardCode.toLowerCase().includes(q) ||
        p.cardName.toLowerCase().includes(q) ||
        (p.licTradNum && p.licTradNum.toLowerCase().includes(q)),
      );
    }
    this.cdr.markForCheck();
  }

  refreshProvEventuales() {
    if (!this.loaded) return;
    this.loading = true;
    this.cdr.markForCheck();

    this.provSvc.getAll()
      .pipe(catchError(() => of([])), takeUntil(this.destroy$))
      .subscribe(prov => {
        const provMapped = prov.map(p => ({
          cardCode: 'PL999999',
          cardName: p.U_RAZON_SOCIAL,
          licTradNum: p.U_NIT,
        }));

        const map = new Map<string, ProveedorDto>();
        [...provMapped, ...this.allItems.filter(p => p.cardCode !== 'PL999999')].forEach(p => {
          const key = `${p.cardCode}|${p.cardName}`;
          if (!map.has(key)) {
            map.set(key, p);
          }
        });

        this.allItems = Array.from(map.values());
        this.filterLocal(this.searchTerm);
        this.loading = false;
        this.cdr.markForCheck();
      });
  }

  select(p: ProveedorDto) {
    this._selected = p;
    this.isOpen    = false;
    this.proveedorChange.emit(p);
    this.cdr.markForCheck();
  }

  clear() {
    this._selected = null;
    this.proveedorChange.emit(null);
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }
}
