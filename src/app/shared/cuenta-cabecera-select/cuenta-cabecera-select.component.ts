import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuentaCabecera } from '../../models/cuenta-cabecera.model';
import { Pipe, PipeTransform } from '@angular/core';

/** Pipe puro: devuelve 'CA' si la cuenta está asociada a empleado, 'CN' si no */
@Pipe({ name: 'cuentaPrefix', standalone: true, pure: true })
export class CuentaPrefixPipe implements PipeTransform {
  transform(cuenta: CuentaCabecera): string {
    return cuenta.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
  }
}

/**
 * Selector de cuenta cabecera de rendición estilo modal-buscador.
 * Recibe la lista de cuentas del perfil activo ya resuelta desde el padre.
 *
 * Uso:
 *   <app-cuenta-cabecera-select
 *     [cuentas]="cuentasCabeceraActivas"
 *     [initialCode]="form.get('cuenta')?.value"
 *     (cuentaChange)="onCuentaChange($event)">
 *   </app-cuenta-cabecera-select>
 */
@Component({
  selector: 'app-cuenta-cabecera-select',
  standalone: true,
  imports: [CommonModule, FormsModule, CuentaPrefixPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Trigger ── */
    .ccs-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.875rem;
      color: var(--text-body); width: 100%; text-align: left;

      &:hover:not(:disabled) { border-color: var(--color-primary); }
      &:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
      &.ccs-trigger--placeholder { color: var(--text-faint); }
      &.ccs-trigger--invalid { border-color: var(--color-danger); }
      &:disabled { cursor: not-allowed; opacity: 0.6; background: var(--bg-subtle); }
    }

    .ccs-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .ccs-trigger-code { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-primary); }
    .ccs-trigger-name { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ccs-trigger-placeholder { font-size: 0.9rem; }
    .ccs-chevron { font-size: 11px; color: var(--text-faint); flex-shrink: 0; }

    /* Badge asociada/no-asociada */
    .ccs-badge {
      display: inline-flex; align-items: center;
      padding: 1px 7px; border-radius: 99px; font-size: 11px; font-weight: 600;
      flex-shrink: 0;
      &.ccs-badge--si  { background: var(--status-open-bg,   #e8f5e9); color: var(--status-open-text,   #2e7d32); }
      &.ccs-badge--no  { background: var(--status-closed-bg, #fce4ec); color: var(--status-closed-text, #c62828); }
    }

    /* ── Modal ── */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: ccsFadeIn 0.15s ease;
    }
    @keyframes ccsFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .ccs-modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-modal);
      width: min(560px, 96vw); max-height: 78vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: ccsSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }
    @keyframes ccsSlideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes ccsSlideUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .modal-backdrop { align-items: flex-end; padding: 0; }
      .ccs-modal {
        width: 100%; max-height: 92vh;
        border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;
        animation: ccsSlideUp 0.25s cubic-bezier(0.34,1.2,0.64,1);
      }
    }

    /* Header */
    .ccs-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
      h4 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    }
    .ccs-close {
      background: none; border: none; font-size: 18px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); }
    }

    /* Search */
    .ccs-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .ccs-search-wrap { position: relative; display: flex; align-items: center; }
    .ccs-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }
    .ccs-search-input {
      width: 100%; padding: 10px 40px 10px 42px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px);
      font-size: 14px; color: var(--text-heading); background: var(--bg-faint);
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--color-primary); background: var(--bg-surface); box-shadow: var(--focus-ring); }
    }
    .ccs-search-clear {
      position: absolute; right: 10px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 4px 6px;
      border-radius: var(--radius-sm); font-size: 13px; line-height: 1;
      &:hover { color: var(--text-muted); background: var(--bg-subtle); }
    }

    /* Count */
    .ccs-count { padding: 8px 20px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }

    /* Body */
    .ccs-body { overflow-y: auto; padding: 8px 12px; }

    /* List */
    .ccs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .ccs-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: var(--radius-lg, 10px);
      cursor: pointer; transition: background 0.1s, transform 0.08s;
      border: 1px solid transparent;

      &:hover {
        background: var(--color-primary-bg);
        border-color: var(--color-primary-border, var(--border-color));
        transform: translateX(2px);
        .ccs-item-name { color: var(--color-primary-text); }
        .ccs-arrow { opacity: 1; transform: translateX(0); }
      }

      &.ccs-item--selected {
        background: var(--color-primary-bg);
        border-color: var(--color-primary);
        .ccs-item-name { color: var(--color-primary-text); }
      }
    }

    .ccs-item-icon { font-size: 18px; flex-shrink: 0; width: 28px; text-align: center; }
    .ccs-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .ccs-item-name {
      font-size: 14px; font-weight: 600; color: var(--text-heading); transition: color 0.1s;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .ccs-item-code {
      font-family: var(--font-mono); font-size: 11px; color: var(--text-faint);
      background: var(--bg-subtle); padding: 1px 6px; border-radius: 4px; align-self: flex-start;
    }
    .ccs-arrow {
      font-size: 16px; color: var(--color-primary); opacity: 0;
      transform: translateX(-4px); transition: opacity 0.1s, transform 0.1s; flex-shrink: 0;
    }

    /* Empty */
    .ccs-empty {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; padding: 48px 24px; text-align: center; color: var(--text-faint);
    }
    .ccs-empty-icon { font-size: 32px; line-height: 1; opacity: 0.5; }
    .ccs-empty p { margin: 0; font-size: 14px; }

    /* Footer */
    .ccs-footer {
      padding: 14px 24px; border-top: 1px solid var(--border-color);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .ccs-footer-hint { font-size: 11px; color: var(--text-faint); }
    kbd {
      display: inline-block; padding: 1px 5px; background: var(--bg-subtle);
      border: 1px solid var(--border-color); border-radius: 4px;
      font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);
    }
  `],
  template: `
    <!-- Trigger -->
    <button type="button" class="ccs-trigger"
      [class.ccs-trigger--placeholder]="!selected"
      [class.ccs-trigger--invalid]="invalid"
      [disabled]="disabled"
      (click)="open()">
      <span class="ccs-trigger-main">
        <ng-container *ngIf="selected; else triggerPlaceholder">
          <span class="ccs-trigger-code">{{ selected | cuentaPrefix }}-{{ selected.U_CuentaFormatCode }}</span>
          <span class="ccs-trigger-name">{{ selected.U_CuentaNombre }}</span>
        </ng-container>
        <ng-template #triggerPlaceholder>
          <span class="ccs-trigger-placeholder">{{ placeholder }}</span>
        </ng-template>
      </span>
      <span class="ccs-chevron">▾</span>
    </button>

    <!-- Modal -->
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="ccs-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="ccs-header">
          <h4>🏦 Seleccionar Cuenta</h4>
          <button type="button" class="ccs-close" (click)="close()">✕</button>
        </div>

        <div class="ccs-search-bar">
          <div class="ccs-search-wrap">
            <span class="ccs-search-icon">⌕</span>
            <input type="text" class="ccs-search-input"
              placeholder="Buscar por código o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="ccs-search-clear"
              (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="ccs-count">
          <span *ngIf="searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }}
            para "<strong>{{ searchTerm }}</strong>"
          </span>
          <span *ngIf="!searchTerm">
            {{ filtered.length }} cuenta{{ filtered.length !== 1 ? 's' : '' }} disponibles
          </span>
        </div>

        <div class="ccs-body">
          <div class="ccs-empty" *ngIf="filtered.length === 0">
            <span class="ccs-empty-icon">🔎</span>
            <p>No se encontraron cuentas
              <ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>.
            </p>
          </div>

          <ul class="ccs-list" *ngIf="filtered.length > 0">
            <li class="ccs-item"
              [class.ccs-item--selected]="selected?.U_CuentaFormatCode === c.U_CuentaFormatCode"
              *ngFor="let c of filtered"
              (click)="select(c)">
              <span class="ccs-item-icon">🏦</span>
              <div class="ccs-item-info">
                <span class="ccs-item-name">{{ c.U_CuentaNombre }}</span>
                <span class="ccs-item-code">{{ c | cuentaPrefix }}-{{ c.U_CuentaFormatCode }}</span>
              </div>
              <span class="ccs-badge" [class.ccs-badge--si]="c.U_CuentaAsociada === 'Y'"
                                      [class.ccs-badge--no]="c.U_CuentaAsociada === 'N'">
                {{ c.U_CuentaAsociada === 'Y' ? 'Asociada' : 'No asociada' }}
              </span>
              <span class="ccs-arrow">→</span>
            </li>
          </ul>
        </div>

        <div class="ccs-footer">
          <span class="ccs-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="close()">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class CuentaCabeceraSelectComponent implements OnChanges {

  /** Lista de cuentas del perfil activo — resuelta por el padre */
  @Input() cuentas:     CuentaCabecera[] = [];
  @Input() initialCode: string | null    = null;
  @Input() placeholder                   = '— Seleccionar cuenta —';
  @Input() disabled                      = false;
  @Input() invalid                       = false;

  @Output() cuentaChange = new EventEmitter<CuentaCabecera | null>();

  isOpen     = false;
  searchTerm = '';
  filtered:  CuentaCabecera[] = [];
  selected:  CuentaCabecera | null = null;

  private cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cuentas']) {
      this.filtered = this.cuentas.slice();

      // Restaurar selección inicial si viene del padre
      if (this.initialCode) {
        this.selected = this.cuentas.find(c => c.U_CuentaFormatCode === this.initialCode) ?? null;
      } else {
        // Si hay exactamente una cuenta, preseleccionarla automáticamente
        if (this.cuentas.length === 1) {
          this.selected = this.cuentas[0];
        } else {
          this.selected = null;
        }
      }
      this.cdr.markForCheck();
    }

    if (changes['initialCode'] && this.initialCode && this.cuentas.length > 0) {
      this.selected = this.cuentas.find(c => c.U_CuentaFormatCode === this.initialCode) ?? null;
      this.cdr.markForCheck();
    }
  }

  open() {
    if (this.disabled || this.cuentas.length === 0) return;
    this.isOpen    = true;
    this.searchTerm = '';
    this.filtered  = this.cuentas.slice();
    this.cdr.markForCheck();
  }

  close() {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  onSearch(term: string) {
    this.searchTerm = term;
    const q = term.toLowerCase().trim();
    this.filtered = q
      ? this.cuentas.filter(c =>
          c.U_CuentaFormatCode.toLowerCase().includes(q) ||
          c.U_CuentaNombre.toLowerCase().includes(q)
        )
      : this.cuentas.slice();
    this.cdr.markForCheck();
  }

  select(c: CuentaCabecera) {
    this.selected = c;
    this.isOpen   = false;
    this.cuentaChange.emit(c);
    this.cdr.markForCheck();
  }

  /** Permite resetear desde el padre (cuando cambia el perfil) */
  reset() {
    this.selected   = null;
    this.searchTerm = '';
    this.filtered   = this.cuentas.slice();
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }
}