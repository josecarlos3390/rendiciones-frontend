import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, OnDestroy, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
  ApplicationRef, createComponent, EnvironmentInjector,
  ComponentRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CuentaCabecera } from '@models/cuenta-cabecera.model';
import { Pipe, PipeTransform } from '@angular/core';

/** Pipe puro: devuelve 'CA' si la cuenta está asociada a empleado, 'CN' si no */
@Pipe({ name: 'cuentaPrefix', standalone: true, pure: true })
export class CuentaPrefixPipe implements PipeTransform {
  transform(cuenta: CuentaCabecera): string {
    return cuenta.U_CuentaAsociada === 'Y' ? 'CA' : 'CN';
  }
}

// ── Componente portal: se renderiza directamente en el <body> ─────────────────
@Component({
  selector: 'app-ccs-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, CuentaPrefixPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .ccs-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999; padding: 24px;
      animation: ccsFadeIn 0.15s ease;
    }
    @keyframes ccsFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .ccs-modal {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px);
      box-shadow: var(--shadow-modal);
      width: min(560px, 96vw); max-height: 78vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: ccsSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }
    @keyframes ccsSlideIn {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 480px) {
      .ccs-overlay { align-items: flex-end; padding: 0; }
      .ccs-modal { width: 100%; max-height: 92vh; border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none; }
    }

    .ccs-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0; }
    .ccs-header h4 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    .ccs-close { background: none; border: none; font-size: 18px; color: var(--text-faint); cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1; }
    .ccs-close:hover { background: var(--bg-subtle); color: var(--text-muted); }

    .ccs-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .ccs-search-wrap { position: relative; display: flex; align-items: center; }
    .ccs-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }
    .ccs-search-input { width: 100%; padding: 10px 40px 10px 42px; border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px); font-size: 14px; color: var(--text-heading); background: var(--bg-faint); font-family: inherit; }
    .ccs-search-input::placeholder { color: var(--text-faint); }
    .ccs-search-input:focus { outline: none; border-color: var(--color-primary); background: var(--bg-surface); }
    .ccs-search-clear { position: absolute; right: 10px; background: none; border: none; color: var(--text-faint); cursor: pointer; padding: 4px 6px; border-radius: var(--radius-sm); font-size: 13px; line-height: 1; }

    .ccs-count { padding: 8px 20px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }
    .ccs-body { overflow-y: auto; padding: 8px 12px; }
    .ccs-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }

    .ccs-item { display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: var(--radius-lg, 10px); cursor: pointer; transition: background 0.1s; border: 1px solid transparent; }
    .ccs-item:hover { background: var(--color-primary-bg); border-color: var(--color-primary-border, var(--border-color)); }
    .ccs-item:hover .ccs-item-name { color: var(--color-primary-text); }
    .ccs-item:hover .ccs-arrow { opacity: 1; }
    .ccs-item--selected { background: var(--color-primary-bg); border-color: var(--color-primary); }
    .ccs-item--selected .ccs-item-name { color: var(--color-primary-text); }

    .ccs-item-icon { font-size: 18px; flex-shrink: 0; width: 28px; text-align: center; }
    .ccs-item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .ccs-item-name { font-size: 14px; font-weight: 600; color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ccs-item-code { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); background: var(--bg-subtle); padding: 1px 6px; border-radius: 4px; align-self: flex-start; }
    .ccs-arrow { font-size: 16px; color: var(--color-primary); opacity: 0; flex-shrink: 0; }

    .ccs-badge { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 99px; font-size: 11px; font-weight: 600; flex-shrink: 0; }
    .ccs-badge--si  { background: #e8f5e9; color: #2e7d32; }
    .ccs-badge--no  { background: #fce4ec; color: #c62828; }

    .ccs-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 48px 24px; text-align: center; color: var(--text-faint); }
    .ccs-empty-icon { font-size: 32px; line-height: 1; opacity: 0.5; }
    .ccs-empty p { margin: 0; font-size: 14px; }

    .ccs-footer { padding: 14px 24px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .ccs-footer-hint { font-size: 11px; color: var(--text-faint); }
    kbd { display: inline-block; padding: 1px 5px; background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: 4px; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
  `],
  template: `
    <div class="ccs-overlay" (click)="emitClose()">
      <div class="ccs-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="ccs-header">
          <h4>🏦 Seleccionar Cuenta</h4>
          <button type="button" class="ccs-close" (click)="emitClose()">✕</button>
        </div>

        <div class="ccs-search-bar">
          <div class="ccs-search-wrap">
            <span class="ccs-search-icon">⌕</span>
            <input type="text" class="ccs-search-input"
              placeholder="Buscar por código o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="ccs-search-clear" (click)="onSearch('')">✕</button>
          </div>
        </div>

        <div class="ccs-count">
          <span *ngIf="searchTerm">{{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }} para "<strong>{{ searchTerm }}</strong>"</span>
          <span *ngIf="!searchTerm">{{ filtered.length }} cuenta{{ filtered.length !== 1 ? 's' : '' }} disponibles</span>
        </div>

        <div class="ccs-body">
          <div class="ccs-empty" *ngIf="filtered.length === 0">
            <span class="ccs-empty-icon">🔎</span>
            <p>No se encontraron cuentas<ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>.</p>
          </div>
          <ul class="ccs-list" *ngIf="filtered.length > 0">
            <li class="ccs-item" [class.ccs-item--selected]="selected?.U_CuentaFormatCode === c.U_CuentaFormatCode"
              *ngFor="let c of filtered" (click)="emitSelect(c)">
              <span class="ccs-item-icon">🏦</span>
              <div class="ccs-item-info">
                <span class="ccs-item-name">{{ c.U_CuentaNombre }}</span>
                <span class="ccs-item-code">{{ c | cuentaPrefix }}-{{ c.U_CuentaFormatCode }}</span>
              </div>
              <span class="ccs-badge" [class.ccs-badge--si]="c.U_CuentaAsociada === 'Y'" [class.ccs-badge--no]="c.U_CuentaAsociada === 'N'">
                {{ c.U_CuentaAsociada === 'Y' ? 'Asociada' : 'No asociada' }}
              </span>
              <span class="ccs-arrow">→</span>
            </li>
          </ul>
        </div>

        <div class="ccs-footer">
          <span class="ccs-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="emitClose()">Cancelar</button>
        </div>

      </div>
    </div>
  `,
})
export class CuentaCabeceraPortalComponent {
  @Input()  cuentas:    CuentaCabecera[] = [];
  @Input()  filtered:   CuentaCabecera[] = [];
  @Input()  selected:   CuentaCabecera | null = null;
  searchTerm = '';

  @Output() closeModal  = new EventEmitter<void>();
  @Output() selectCuenta = new EventEmitter<CuentaCabecera>();

  emitClose()  { this.closeModal.emit(); }
  emitSelect(c: CuentaCabecera) { this.selectCuenta.emit(c); }

  onSearch(term: string) {
    this.searchTerm = term;
    const q = term.toLowerCase().trim();
    this.filtered = q
      ? this.cuentas.filter(c =>
          c.U_CuentaFormatCode.toLowerCase().includes(q) ||
          c.U_CuentaNombre.toLowerCase().includes(q)
        )
      : this.cuentas.slice();
  }
}

// ── Componente principal (solo trigger) ──────────────────────────────────────
/**
 * Selector de cuenta cabecera de rendición.
 * El modal se renderiza en el <body> via portal para evitar el stacking
 * context creado por backdrop-filter en el modal padre.
 */
@Component({
  selector: 'app-cuenta-cabecera-select',
  standalone: true,
  imports: [CommonModule, CuentaPrefixPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .ccs-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.875rem;
      color: var(--text-body); width: 100%; text-align: left;
    }
    .ccs-trigger:hover:not(:disabled) { border-color: var(--color-primary); }
    .ccs-trigger:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
    .ccs-trigger--placeholder { color: var(--text-faint); }
    .ccs-trigger--invalid { border-color: var(--color-danger); }
    .ccs-trigger:disabled { cursor: not-allowed; opacity: 0.6; background: var(--bg-subtle); }
    .ccs-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .ccs-trigger-code { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-primary); }
    .ccs-trigger-name { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ccs-trigger-placeholder { font-size: 0.9rem; }
    .ccs-chevron { font-size: 11px; color: var(--text-faint); flex-shrink: 0; }
  `],
  template: `
    <button type="button" class="ccs-trigger"
      [class.ccs-trigger--placeholder]="!selected"
      [class.ccs-trigger--invalid]="invalid"
      [disabled]="disabled"
      (click)="open()">
      <span class="ccs-trigger-main">
        <ng-container *ngIf="selected; else placeholder">
          <span class="ccs-trigger-code">{{ selected | cuentaPrefix }}-{{ selected.U_CuentaFormatCode }}</span>
          <span class="ccs-trigger-name">{{ selected.U_CuentaNombre }}</span>
        </ng-container>
        <ng-template #placeholder>
          <span class="ccs-trigger-placeholder">{{ placeholderText }}</span>
        </ng-template>
      </span>
      <span class="ccs-chevron">▾</span>
    </button>
  `,
})
export class CuentaCabeceraSelectComponent implements OnChanges, OnDestroy {

  @Input() cuentas:     CuentaCabecera[] = [];
  @Input() initialCode: string | null    = null;
  @Input() placeholderText               = '— Seleccionar cuenta —';
  // Mantener compatibilidad con el nombre anterior
  @Input() set placeholder(v: string) { this.placeholderText = v; }
  @Input() disabled                      = false;
  @Input() invalid                       = false;

  @Output() cuentaChange = new EventEmitter<CuentaCabecera | null>();

  isOpen   = false;
  filtered: CuentaCabecera[] = [];
  selected: CuentaCabecera | null = null;

  private cdr         = inject(ChangeDetectorRef);
  private appRef      = inject(ApplicationRef);
  private envInjector = inject(EnvironmentInjector);
  private portalRef: ComponentRef<CuentaCabeceraPortalComponent> | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['cuentas']) {
      this.filtered = this.cuentas.slice();
      this.resolveSelected();
      this.cdr.markForCheck();
    }
    if (changes['initialCode']) {
      this.resolveSelected();
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.destroyPortal();
  }

  private resolveSelected() {
    if (this.initialCode && this.cuentas.length > 0) {
      // Limpiar prefijo CA-/CN- si viene con él
      const codeClean = this.initialCode.replace(/^(CA|CN)-/i, '');
      this.selected = this.cuentas.find(c => c.U_CuentaFormatCode === codeClean) ?? null;
    } else if (!this.initialCode && this.cuentas.length === 1) {
      // Una sola cuenta: preseleccionar automáticamente
      this.selected = this.cuentas[0];
    } else if (!this.initialCode) {
      this.selected = null;
    }
  }

  open() {
    if (this.disabled || this.cuentas.length === 0) return;
    this.isOpen   = true;
    this.filtered = this.cuentas.slice();
    this.mountPortal();
    this.cdr.markForCheck();
  }

  close() {
    this.isOpen = false;
    this.destroyPortal();
    this.cdr.markForCheck();
  }

  select(c: CuentaCabecera) {
    this.selected = c;
    this.close();
    this.cuentaChange.emit(c);
    this.cdr.markForCheck();
  }

  reset() {
    this.selected = null;
    this.filtered = this.cuentas.slice();
    this.destroyPortal();
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.isOpen) this.close(); }

  // ── Portal ──────────────────────────────────────────────────────────────────

  private mountPortal() {
    this.destroyPortal();

    const ref = createComponent(CuentaCabeceraPortalComponent, {
      environmentInjector: this.envInjector,
    });

    ref.instance.cuentas  = this.cuentas;
    ref.instance.filtered = this.filtered.slice();
    ref.instance.selected = this.selected;

    ref.instance.closeModal.subscribe(() => this.close());
    ref.instance.selectCuenta.subscribe((c: CuentaCabecera) => this.select(c));

    document.body.appendChild(ref.location.nativeElement);
    this.appRef.attachView(ref.hostView);
    ref.changeDetectorRef.detectChanges();

    this.portalRef = ref;
  }

  private destroyPortal() {
    if (this.portalRef) {
      this.appRef.detachView(this.portalRef.hostView);
      this.portalRef.destroy();
      this.portalRef = null;
    }
  }
}