import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Perfil } from '../../models/perfil.model';
import { PerfilesService } from '../../pages/perfiles/perfiles.service';

/**
 * Selector de perfil estilo modal-buscador.
 *
 * Uso:
 *   <app-perfil-select
 *     placeholder="Seleccione un perfil"
 *     (perfilChange)="onPerfilChange($event)"
 *     (perfilObjChange)="selectedPerfil = $event">
 *   </app-perfil-select>
 */
@Component({
  selector: 'app-perfil-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Trigger (campo clicable) ── */
    .ps-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.9rem;
      color: var(--text-body); width: 100%; text-align: left;

      &:hover { border-color: var(--color-primary); }
      &:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }

      &.ps-trigger--placeholder { color: var(--text-faint); }
      &:disabled { cursor: not-allowed; opacity: 0.6; background: var(--bg-subtle); }
    }

    .ps-trigger-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .ps-trigger-icons { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }

    .ps-clear-btn {
      background: none; border: none; color: var(--text-faint); cursor: pointer;
      padding: 0 2px; font-size: 13px; line-height: 1;
      &:hover { color: var(--color-danger); }
    }

    .ps-chevron { font-size: 11px; color: var(--text-faint); }

    /* ── Modal ── */
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: psFadeIn 0.15s ease; }

    @keyframes psFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .ps-modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-modal);
      width: min(560px, 96vw); max-height: 80vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: psSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }

    @keyframes psSlideIn { from { opacity:0; transform: translateY(12px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }

    /* Header */
    .ps-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 24px; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
      h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-heading); }
    }

    .ps-modal-close {
      background: none; border: none; font-size: 18px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm);
      line-height: 1; &:hover { background: var(--bg-subtle); color: var(--text-muted); }
    }

    /* Search bar */
    .ps-search-bar { padding: 16px 24px 0; flex-shrink: 0; }

    .ps-search-wrap { position: relative; display: flex; align-items: center; }

    .ps-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }

    .ps-search-input {
      width: 100%; padding: 10px 40px 10px 42px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px);
      font-size: 14px; color: var(--text-heading); background: var(--bg-faint);
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--color-primary); background: var(--bg-surface); box-shadow: var(--focus-ring); }
    }

    .ps-search-clear {
      position: absolute; right: 10px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 4px 6px;
      border-radius: var(--radius-sm); font-size: 13px; line-height: 1;
      &:hover { color: var(--text-muted); background: var(--bg-subtle); }
    }

    /* Results count */
    .ps-count { padding: 8px 24px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }

    /* Body */
    .ps-body { overflow-y: auto; padding: 8px 12px; }

    /* List */
    .ps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .ps-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: var(--radius-lg, 10px);
      cursor: pointer; transition: background 0.1s, transform 0.08s;
      border: 1px solid transparent;

      &:hover {
        background: var(--color-primary-bg);
        border-color: var(--color-primary-border, var(--border-color));
        transform: translateX(2px);
        .ps-item-name { color: var(--color-primary-text); }
        .ps-arrow { opacity: 1; transform: translateX(0); }
      }
    }

    .ps-item-icon { font-size: 18px; flex-shrink: 0; width: 28px; text-align: center; }

    .ps-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }

    .ps-item-name { font-size: 14px; font-weight: 600; color: var(--text-heading); transition: color 0.1s;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .ps-item-code { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint);
      background: var(--bg-subtle); padding: 1px 6px; border-radius: 4px; align-self: flex-start; }

    .ps-arrow { font-size: 16px; color: var(--color-primary); opacity: 0;
      transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0; }

    /* Empty */
    .ps-empty { display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; padding: 48px 24px; text-align: center; color: var(--text-faint); }
    .ps-empty-icon { font-size: 32px; line-height: 1; opacity: 0.5; }
    .ps-empty p { margin: 0; font-size: 14px; }

    /* Footer */
    .ps-footer { padding: 14px 24px; border-top: 1px solid var(--border-color);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .ps-footer-hint { font-size: 11px; color: var(--text-faint); }
    kbd { display: inline-block; padding: 1px 5px; background: var(--bg-subtle);
      border: 1px solid var(--border-color); border-radius: 4px;
      font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
  `],
  template: `
    <!-- Campo trigger -->
    <button type="button" class="ps-trigger"
      [class.ps-trigger--placeholder]="!selected"
      [disabled]="disabled"
      (click)="open()">
      <span class="ps-trigger-text">{{ selected ? selected.U_NombrePerfil : placeholder }}</span>
      <span class="ps-trigger-icons">
        <button *ngIf="selected" type="button" class="ps-clear-btn"
          (click)="$event.stopPropagation(); clear()" title="Limpiar">✕</button>
        <span class="ps-chevron">▼</span>
      </span>
    </button>

    <!-- Modal -->
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="ps-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="ps-header">
          <h3>🏷️ Seleccionar Perfil</h3>
          <button type="button" class="ps-modal-close" (click)="close()">✕</button>
        </div>

        <div class="ps-search-bar">
          <div class="ps-search-wrap">
            <span class="ps-search-icon">⌕</span>
            <input type="text" class="ps-search-input"
              placeholder="Buscar perfil..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="ps-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="ps-count">
          <span *ngIf="loading">Cargando perfiles...</span>
          <span *ngIf="!loading && searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }} para "<strong>{{ searchTerm }}</strong>"
          </span>
          <span *ngIf="!loading && !searchTerm">
            {{ filtered.length }} perfil{{ filtered.length !== 1 ? 'es' : '' }} disponibles
          </span>
        </div>

        <div class="ps-body">
          <div class="ps-empty" *ngIf="loading">
            <span class="ps-empty-icon">⏳</span>
            <p>Cargando perfiles...</p>
          </div>

          <div class="ps-empty" *ngIf="!loading && filtered.length === 0">
            <span class="ps-empty-icon">🔎</span>
            <p>No se encontraron perfiles<ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>.</p>
          </div>

          <ul class="ps-list" *ngIf="!loading && filtered.length > 0">
            <li class="ps-item" *ngFor="let p of filtered" (click)="select(p)">
              <span class="ps-item-icon">🏷️</span>
              <div class="ps-item-info">
                <span class="ps-item-name">{{ p.U_NombrePerfil }}</span>
                <span class="ps-item-code">ID {{ p.U_CodPerfil }}</span>
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
export class PerfilSelectComponent implements OnInit, OnDestroy {
  @Input() placeholder = '— Seleccione Perfil —';
  @Input() value: number | null = null;
  @Input() disabled = false;

  @Output() perfilChange    = new EventEmitter<number | null>();
  @Output() perfilObjChange = new EventEmitter<Perfil | null>();

  isOpen     = false;
  loading    = false;
  searchTerm = '';
  all:      Perfil[] = [];
  filtered: Perfil[] = [];
  selected: Perfil | null = null;

  private svc = inject(PerfilesService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (data) => {
        this.all      = data;
        this.filtered = data;
        this.loading  = false;
        if (this.value) {
          this.selected = data.find(p => p.U_CodPerfil === this.value) ?? null;
        }
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }

  ngOnDestroy() {}

  open() { this.isOpen = true; this.searchTerm = ''; this.filtered = this.all; this.cdr.markForCheck(); }
  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    const q = term.toLowerCase().trim();
    this.filtered = q
      ? this.all.filter(p => p.U_NombrePerfil.toLowerCase().includes(q) || String(p.U_CodPerfil).includes(q))
      : this.all;
    this.cdr.markForCheck();
  }

  select(p: Perfil) {
    this.selected = p;
    this.isOpen   = false;
    this.perfilChange.emit(p.U_CodPerfil);
    this.perfilObjChange.emit(p);
    this.cdr.markForCheck();
  }

  clear() {
    this.selected = null;
    this.perfilChange.emit(null);
    this.perfilObjChange.emit(null);
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }
}
