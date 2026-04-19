import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { environment } from '@env';

export interface UsuarioItem {
  login:   string;  // U_Login
  nombre:  string;  // U_NomUser
  esAdmin: boolean; // U_SuperUser
}

/**
 * Buscador de usuarios del sistema (REND_U) — mismo patrón que EmpleadoSearch.
 *
 * Uso:
 *   <app-usuario-search
 *     [initialLogin]="form.get('supervisorName')?.value"
 *     (usuarioChange)="onAprobadorSelected($event)">
 *   </app-usuario-search>
 *
 * Para limpiar desde afuera: <app-usuario-search #uSearch> → uSearch.reset()
 */
@Component({
  selector:        'app-usuario-search',
  standalone:      true,
  imports:         [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Trigger ─────────────────────────────────────────── */
    .us-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.875rem;
      color: var(--text-body); width: 100%; text-align: left;
    }
    .us-trigger:hover  { border-color: var(--color-primary); }
    .us-trigger:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
    .us-trigger--placeholder { color: var(--text-faint); }
    .us-trigger--invalid     { border-color: var(--color-danger); }
    .us-trigger--none {
      border-style: dashed; color: var(--text-faint); font-style: italic;
    }

    .us-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .us-trigger-login  { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-primary); }
    .us-trigger-nombre { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .us-trigger-icons  { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .us-clear-btn {
      background: none; border: none; color: var(--text-faint);
      cursor: pointer; padding: 0 2px; font-size: 13px; line-height: 1;
    }
    .us-clear-btn:hover { color: var(--color-danger); }
    .us-chevron { font-size: 11px; color: var(--text-faint); }

    /* ── Modal ───────────────────────────────────────────── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: usFadeIn 0.15s ease;
    }
    @keyframes usFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .us-modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-modal);
      width: min(520px, 96vw); max-height: 78vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: usSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }
    @keyframes usSlideIn {
      from { opacity:0; transform: translateY(12px) scale(0.97); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }
    @keyframes usSlideUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .modal-backdrop { align-items: flex-end; padding: 0; }
      .us-modal {
        width: 100%; max-height: 92vh;
        border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;
        animation: usSlideUp 0.25s cubic-bezier(0.34,1.2,0.64,1);
      }
    }

    .us-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
    }
    .us-header h4 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    .us-close {
      background: none; border: none; font-size: 18px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
    }
    .us-close:hover { background: var(--bg-subtle); color: var(--text-muted); }

    .us-search-bar  { padding: 14px 20px 0; flex-shrink: 0; }
    .us-search-wrap { position: relative; display: flex; align-items: center; }
    .us-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }
    .us-search-input {
      width: 100%; padding: 10px 40px 10px 42px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px);
      font-size: 14px; color: var(--text-heading); background: var(--bg-faint);
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .us-search-input::placeholder { color: var(--text-faint); }
    .us-search-input:focus {
      outline: none; border-color: var(--color-primary);
      background: var(--bg-surface); box-shadow: var(--focus-ring);
    }
    .us-search-clear {
      position: absolute; right: 10px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 4px 6px;
      border-radius: var(--radius-sm); font-size: 13px; line-height: 1;
    }
    .us-search-clear:hover { color: var(--text-muted); background: var(--bg-subtle); }

    .us-count { padding: 8px 20px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }

    .us-body { overflow-y: auto; padding: 8px 12px; }
    .us-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .us-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: var(--radius-md, 8px); cursor: pointer;
      transition: background 0.1s;
    }
    .us-item:hover { background: var(--bg-faint); }
    .us-item--selected { background: var(--color-primary-bg); }

    .us-item-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: var(--color-primary-bg); border: 1.5px solid var(--color-primary-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; color: var(--color-primary-text);
      font-family: var(--font-mono);
    }
    .us-item-info  { flex: 1; min-width: 0; }
    .us-item-nombre { font-size: 0.875rem; font-weight: 600; color: var(--text-heading); }
    .us-item-login  {
      font-size: 12px; font-family: var(--font-mono);
      color: var(--color-primary); opacity: 0.85;
    }
    .us-item-badge {
      font-size: 10px; font-weight: 700; padding: 1px 6px;
      border-radius: var(--radius-pill); background: var(--color-primary-bg);
      color: var(--color-primary-text); border: 1px solid var(--color-primary-border);
      flex-shrink: 0;
    }

    .us-empty {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 32px 16px; color: var(--text-muted); text-align: center;
    }
    .us-empty-icon { font-size: 32px; }

    /* Opción "Sin aprobador" */
    .us-none-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: var(--radius-md);
      cursor: pointer; transition: background 0.1s;
      border-bottom: 1px solid var(--border-soft); margin-bottom: 4px;
    }
    .us-none-item:hover { background: var(--bg-faint); }
    .us-none-icon { font-size: 20px; width: 32px; text-align: center; flex-shrink: 0; }
    .us-none-label { font-size: 0.875rem; color: var(--text-muted); font-style: italic; }
  `],
  template: `
    <!-- ── Trigger ── -->
    <button
      type="button"
      [class]="'us-trigger' +
        (!selected ? ' us-trigger--placeholder' : '') +
        (invalid   ? ' us-trigger--invalid'     : '')"
      (click)="open()">
      <div class="us-trigger-main">
        <ng-container *ngIf="selected; else placeholder">
          <span class="us-trigger-login">{{ selected.login }}</span>
          <span class="us-trigger-nombre">{{ selected.nombre }}</span>
        </ng-container>
        <ng-template #placeholder>
          <span class="us-trigger-placeholder">{{ placeholderText }}</span>
        </ng-template>
      </div>
      <div class="us-trigger-icons">
        <button *ngIf="selected && allowClear" type="button" class="us-clear-btn"
          (click)="$event.stopPropagation(); clear()" title="Quitar aprobador">✕</button>
        <span class="us-chevron">▾</span>
      </div>
    </button>

    <!-- ── Modal ── -->
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="us-modal" (click)="$event.stopPropagation()">

        <div class="us-header">
          <h4>👤 Seleccionar Aprobador</h4>
          <button type="button" class="us-close" (click)="close()">✕</button>
        </div>

        <div class="us-search-bar">
          <div class="us-search-wrap">
            <span class="us-search-icon">⌕</span>
            <input #searchInput type="text" class="us-search-input"
              placeholder="Buscar por login o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="us-search-clear"
              (click)="onSearch(''); searchInput.value = ''">✕</button>
          </div>
        </div>

        <div class="us-count">
          <span *ngIf="loading">Cargando usuarios...</span>
          <span *ngIf="!loading && searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }} para
            "<strong>{{ searchTerm }}</strong>"
          </span>
          <span *ngIf="!loading && !searchTerm">
            {{ filtered.length }} usuario{{ filtered.length !== 1 ? 's' : '' }} activos
          </span>
        </div>

        <div class="us-body">

          <!-- Loading -->
          <div class="us-empty" *ngIf="loading">
            <span class="us-empty-icon">⏳</span>
            <p>Cargando usuarios del sistema...</p>
          </div>

          <!-- Sin resultados -->
          <div class="us-empty" *ngIf="!loading && filtered.length === 0">
            <span class="us-empty-icon">👤</span>
            <p>No se encontraron usuarios
              <ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>
            </p>
          </div>

          <ul class="us-list" *ngIf="!loading && (filtered.length > 0 || allowClear)">

            <!-- Opción "Sin aprobador" siempre visible si allowClear -->
            <li class="us-none-item" *ngIf="allowClear && !searchTerm" (click)="clear()">
              <span class="us-none-icon">🚫</span>
              <span class="us-none-label">Sin aprobador — este usuario es el nivel final</span>
            </li>

            <!-- Lista de usuarios -->
            <li class="us-item" *ngFor="let u of filtered"
              [class.us-item--selected]="selected?.login === u.login"
              (click)="select(u)">
              <div class="us-item-avatar">{{ u.login.substring(0,2).toUpperCase() }}</div>
              <div class="us-item-info">
                <div class="us-item-nombre">{{ u.nombre }}</div>
                <div class="us-item-login">{{ u.login }}</div>
              </div>
              <span class="us-item-badge" *ngIf="u.esAdmin">Admin</span>
            </li>

          </ul>
        </div>

      </div>
    </div>
  `,
})
export class UsuarioSearchComponent implements OnInit, OnDestroy, OnChanges {

  /** Login inicial para modo edición */
  @Input() initialLogin: string | null = null;
  /** Placeholder cuando no hay selección */
  @Input() placeholderText = '— Seleccionar aprobador —';
  /** Mostrar opción "Sin aprobador" */
  @Input() allowClear = true;
  /** Marcar con borde rojo si inválido */
  @Input() invalid = false;
  /** Excluir un login de la lista (p.ej. el propio usuario) */
  @Input() excludeLogin: string | null = null;

  @Output() usuarioChange = new EventEmitter<UsuarioItem | null>();

  isOpen     = false;
  loading    = false;
  searchTerm = '';
  all:      UsuarioItem[] = [];
  filtered: UsuarioItem[] = [];
  selected: UsuarioItem | null = null;

  private search$  = new Subject<string>();
  private destroy$ = new Subject<void>();
  private http     = inject(HttpClient);
  private cdr      = inject(ChangeDetectorRef);

  private get api() { return `${environment.apiUrl}/users`; }

  ngOnInit() {
    this.search$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(term => {
      this.filtered = this._filter(term);
      this.cdr.markForCheck();
    });

    // setTimeout(0) evita el problema de OnPush/shareReplay que deja "Cargando" colgado
    setTimeout(() => this.loadUsuarios(), 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['initialLogin'] && !changes['initialLogin'].firstChange) {
      this._restoreInitial();
    }
    if (changes['excludeLogin'] && !changes['excludeLogin'].firstChange && this.all.length) {
      this.filtered = this._filter(this.searchTerm);
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.isOpen) this.close(); }

  open() {
    this.isOpen     = true;
    this.searchTerm = '';
    this.filtered   = this._filter('');
    this.cdr.markForCheck();
  }

  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    this.search$.next(term);
  }

  select(u: UsuarioItem) {
    this.selected = u;
    this.isOpen   = false;
    this.usuarioChange.emit(u);
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.isOpen   = false;
    this.usuarioChange.emit(null);
    this.cdr.markForCheck();
  }

  reset() {
    this.selected   = null;
    this.searchTerm = '';
    this.filtered   = this._filter('');
    this.cdr.markForCheck();
  }

  private loadUsuarios() {
    this.loading = true;
    this.cdr.markForCheck();

    this.http.get<any[]>(this.api)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Mapear desde RendU — funciona online (HANA) y offline (Postgres)
          this.all = data
            .filter(u => {
              const estado = u.U_Estado ?? u.u_estado ?? '1';
              return estado === '1'; // solo activos
            })
            .map(u => ({
              login:   u.U_Login   ?? u.u_login   ?? '',
              nombre:  u.U_NomUser ?? u.u_nomuser ?? '',
              esAdmin: Number(u.U_SuperUser ?? u.u_superuser ?? 0) === 1,
            }))
            .filter(u => u.login); // sin logins vacíos

          this.filtered = this._filter('');
          this.loading  = false;
          this._restoreInitial();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private _filter(term: string): UsuarioItem[] {
    const q = term.toLowerCase().trim();
    let list = this.all.filter(u => u.login !== this.excludeLogin);
    if (q) {
      list = list.filter(u =>
        u.login.toLowerCase().includes(q) ||
        u.nombre.toLowerCase().includes(q)
      );
    }
    return list;
  }

  private _restoreInitial() {
    if (!this.initialLogin) return;
    const found = this.all.find(u => u.login === this.initialLogin);
    if (found) {
      this.selected = found;
      this.cdr.markForCheck();
    }
  }
}