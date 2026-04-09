import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
  HostListener, ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * SelectOption — contrato de opciones para AppSelectComponent.
 */
export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  /** Texto secundario opcional (código, descripción corta, etc.) */
  hint?: string;
  /** Icono emoji o texto corto (ej. '🏷️', '✅') */
  icon?: string;
  disabled?: boolean;
}

/**
 * AppSelectComponent — selector estándar del sistema.
 *
 * Reemplaza a todos los <select> nativos en los formularios.
 * Usa el mismo estilo modal-buscador que PerfilSelectComponent y
 * CuentaSearchComponent, con el trigger visual de la imagen de referencia
 * (campo dashed con ícono de personas + flecha).
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Uso básico                                                     │
 * │                                                                 │
 * │  <app-select                                                    │
 * │    label="Tipo Documento"                                       │
 * │    [required]="true"                                            │
 * │    [options]="tipoDocOptions"                                   │
 * │    [value]="form.get('tipoDoc')?.value"                        │
 * │    (valueChange)="form.get('tipoDoc')?.setValue($event)">      │
 * │  </app-select>                                                  │
 * │                                                                 │
 * │  Donde tipoDocOptions: SelectOption[] = [                       │
 * │    { value: 'FACTURA', label: 'Factura', icon: '🧾' },         │
 * │    { value: 'RECIBO',  label: 'Recibo',  icon: '📄' },         │
 * │  ];                                                             │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Con Reactive Forms                                             │
 * │                                                                 │
 * │  <app-select                                                    │
 * │    [options]="opciones"                                         │
 * │    [formValue]="form.get('campo')?.value"                       │
 * │    (valueChange)="form.get('campo')?.setValue($event)">        │
 * │  </app-select>                                                  │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Parámetros:
 *  - options:      SelectOption[]      Lista de opciones
 *  - value:        T | null            Valor seleccionado actualmente
 *  - placeholder:  string              Texto cuando no hay selección
 *  - label:        string              Label visible sobre el trigger (opcional)
 *  - required:     boolean             Muestra asterisco rojo
 *  - disabled:     boolean             Deshabilita el campo
 *  - searchable:   boolean             Muestra barra de búsqueda (default true si opciones > 5)
 *  - modalTitle:   string              Título del modal (default: igual al label)
 *  - icon:         string              Ícono emoji para el header del modal
 *  - clearable:    boolean             Muestra botón de limpiar (default true)
 *
 * Emite:
 *  - valueChange:  T | null
 *  - optionChange: SelectOption | null (objeto completo)
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    /* ── Host ── */
    :host { display: block; }

    /* ══════════════════════════════════════════════════════
       TRIGGER — campo principal, dos estados:
       · vacío  → borde dashed + fondo sutil
       · con valor → borde sólido + fondo blanco
       ══════════════════════════════════════════════════════ */
    .as-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 0 14px;
      height: 40px;
      border: 1.5px dashed var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      cursor: pointer;
      font-family: var(--font-body);
      font-size: var(--text-md, 14px);
      font-weight: var(--weight-medium, 500);
      color: var(--text-body);
      width: 100%;
      text-align: left;
      transition:
        border-color 0.14s ease,
        background   0.14s ease,
        box-shadow   0.14s ease;

      &:hover:not(:disabled) {
        border-color: var(--color-primary, #4361ee);
        border-style: solid;
        background: var(--color-primary-bg, #eef0fd);
      }

      &:focus-visible {
        outline: none;
        border-color: var(--border-focus, #4361ee);
        border-style: solid;
        box-shadow: var(--shadow-focus, 0 0 0 3px rgba(67,97,238,0.20));
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        background: var(--bg-subtle);
        border-style: solid;
      }

      &.as-trigger--has-value {
        border-style: solid;
        border-color: var(--border-color);
        background: var(--bg-surface);

        &:hover:not(:disabled) {
          border-color: var(--color-primary, #4361ee);
          background: var(--bg-surface);
        }
      }

      &.as-trigger--placeholder .as-trigger-text {
        color: var(--text-faint);
        font-weight: var(--weight-regular, 400);
      }

      &.as-trigger--invalid {
        border-color: var(--color-danger);
        border-style: solid;
        &:focus-visible { box-shadow: 0 0 0 3px rgba(220,38,38,0.14); }
      }
    }

    .as-trigger-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .as-trigger-icon {
      font-size: 15px;
      flex-shrink: 0;
      opacity: 0.65;
      line-height: 1;
    }

    .as-trigger-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: var(--weight-medium, 500);
      color: var(--text-heading);
    }

    .as-trigger-hint {
      font-size: var(--text-sm, 12.5px);
      color: var(--text-faint);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: var(--weight-regular, 400);
      font-family: var(--font-mono, monospace);
      margin-left: 4px;
    }

    .as-trigger-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .as-clear-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: var(--bg-subtle);
      border: none;
      border-radius: var(--radius-xs, 4px);
      color: var(--text-faint);
      cursor: pointer;
      font-size: 11px;
      line-height: 1;
      transition: background 0.12s, color 0.12s;
      &:hover { background: var(--color-danger-soft); color: var(--color-danger); }
    }

    .as-chevron {
      font-size: 9px;
      color: var(--text-faint);
      transition: transform 0.16s ease;
      opacity: 0.7;
      &.open { transform: rotate(180deg); }
    }

    /* ══════════════════════════════════════════════════════
       BACKDROP
       ══════════════════════════════════════════════════════ */
    .as-backdrop {
      position: fixed;
      inset: 0;
      background: var(--bg-overlay, rgba(13,14,26,0.52));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 24px;
      animation: asFadeIn 0.16s ease;
    }

    @keyframes asFadeIn { from { opacity: 0 } to { opacity: 1 } }

    /* ══════════════════════════════════════════════════════
       MODAL PANEL
       ══════════════════════════════════════════════════════ */
    .as-modal {
      background: var(--bg-surface);
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-xl, 16px);
      box-shadow: var(--shadow-modal);
      width: min(460px, 96vw);
      max-height: 76vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: asSlideIn 0.22s cubic-bezier(0.34,1.3,0.64,1);
    }

    @keyframes asSlideIn {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1); }
    }

    @keyframes asSlideUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .as-backdrop { align-items: flex-end; padding: 0; }
      .as-modal {
        width: 100%; max-height: 92vh;
        border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none;
        animation: asSlideUp 0.25s cubic-bezier(0.34,1.2,0.64,1);
      }
    }

    /* Header */
    .as-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-soft);
      flex-shrink: 0;
      background: var(--bg-faint);

      h3 {
        margin: 0;
        font-size: var(--text-base, 13.5px);
        font-weight: var(--weight-bold, 700);
        color: var(--text-heading);
        display: flex;
        align-items: center;
        gap: 8px;
        letter-spacing: -0.01em;
      }
    }

    .as-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: none;
      border: none;
      border-radius: var(--radius-sm, 6px);
      font-size: 15px;
      color: var(--text-faint);
      cursor: pointer;
      transition: background 0.13s, color 0.13s;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); }
    }

    /* Search bar */
    .as-search-bar {
      padding: 14px 16px 0;
      flex-shrink: 0;
    }

    .as-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .as-search-icon {
      position: absolute;
      left: 11px;
      font-size: 14px;
      color: var(--text-faint);
      pointer-events: none;
    }

    .as-search-input {
      width: 100%;
      padding: 9px 36px 9px 36px;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md, 9px);
      font-size: var(--text-base, 13.5px);
      color: var(--text-heading);
      background: var(--bg-subtle);
      font-family: var(--font-body);
      transition: border-color 0.14s, box-shadow 0.14s, background 0.14s;

      &::placeholder { color: var(--text-faint); }
      &:focus {
        outline: none;
        border-color: var(--border-focus, #4361ee);
        background: var(--bg-surface);
        box-shadow: var(--shadow-focus, 0 0 0 3px rgba(67,97,238,0.20));
      }
    }

    .as-search-clear {
      position: absolute;
      right: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: var(--bg-subtle);
      border: none;
      border-radius: var(--radius-xs, 4px);
      color: var(--text-faint);
      cursor: pointer;
      font-size: 11px;
      line-height: 1;
      transition: background 0.12s;
      &:hover { background: var(--border-color); color: var(--text-muted); }
    }

    /* Count pill */
    .as-count {
      padding: 8px 16px 0;
      font-size: var(--text-xs, 11px);
      color: var(--text-faint);
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    /* Options body */
    .as-body {
      overflow-y: auto;
      padding: 8px;
      flex: 1;
    }

    .as-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    /* Option row */
    .as-option {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 9px 12px;
      border-radius: var(--radius-md, 9px);
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.12s, border-color 0.12s;
      position: relative;

      &:hover {
        background: var(--color-primary-bg, #eef0fd);
        border-color: var(--color-primary-border, #c5ccf8);

        .as-option-label { color: var(--color-primary-text, #2c44b8); }
        .as-option-hint  { color: var(--text-muted); }
        .as-arrow        { opacity: 1; transform: translateX(0); }
      }

      &.as-option--selected {
        background: var(--color-primary-bg, #eef0fd);
        border-color: var(--color-primary-border, #c5ccf8);

        .as-option-label { color: var(--color-primary-text); font-weight: var(--weight-semibold, 600); }
        .as-selected-check { opacity: 1; }
        .as-arrow { display: none; }
      }

      &.as-option--disabled {
        opacity: 0.38;
        cursor: not-allowed;
        pointer-events: none;
      }
    }

    .as-option-icon {
      font-size: 16px;
      flex-shrink: 0;
      width: 24px;
      text-align: center;
      line-height: 1;
    }

    .as-option-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .as-option-label {
      font-size: var(--text-base, 13.5px);
      font-weight: var(--weight-medium, 500);
      color: var(--text-heading);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color 0.12s;
    }

    .as-option-hint {
      font-size: var(--text-xs, 11px);
      color: var(--text-faint);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--font-mono, monospace);
    }

    .as-selected-check {
      color: var(--color-primary, #4361ee);
      font-size: 14px;
      flex-shrink: 0;
      opacity: 0;
      transition: opacity 0.12s;
      font-weight: var(--weight-bold, 700);
    }

    .as-arrow {
      font-size: 11px;
      color: var(--color-primary, #4361ee);
      opacity: 0;
      transform: translateX(-4px);
      transition: opacity 0.12s, transform 0.12s;
      flex-shrink: 0;
    }

    /* Empty state */
    .as-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 44px 24px;
      text-align: center;
      color: var(--text-faint);

      .as-empty-icon { font-size: 28px; line-height: 1; opacity: 0.45; }
      p { margin: 0; font-size: var(--text-base, 13.5px); }
    }

    /* Footer */
    .as-footer {
      padding: 11px 16px;
      border-top: 1px solid var(--border-soft);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      background: var(--bg-faint);
    }

    .as-footer-hint {
      font-size: var(--text-xs, 11px);
      color: var(--text-faint);
      display: flex;
      align-items: center;
      gap: 5px;
    }

    kbd {
      display: inline-flex;
      align-items: center;
      padding: 1px 5px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xs, 4px);
      font-family: var(--font-mono, monospace);
      font-size: 10px;
      color: var(--text-muted);
      box-shadow: 0 1px 0 var(--border-color);
    }

    /* Dark mode */
    [data-theme="dark"] .as-option:hover,
    [data-theme="dark"] .as-option.as-option--selected {
      background: rgba(67,97,238,0.12);
      border-color: rgba(67,97,238,0.25);
    }
  `],
  template: `
    <!-- ── Trigger ── -->
    <button
      type="button"
      class="as-trigger"
      [class.as-trigger--has-value]="selectedOption !== null"
      [class.as-trigger--placeholder]="selectedOption === null"
      [class.as-trigger--invalid]="invalid"
      [disabled]="disabled"
      (click)="openModal()">

      <span class="as-trigger-left">
        <span *ngIf="triggerIcon" class="as-trigger-icon">{{ triggerIcon }}</span>
        <ng-container *ngIf="selectedOption; else placeholderTpl">
          <span class="as-trigger-text">{{ selectedOption.label }}</span>
          <span *ngIf="selectedOption.hint" class="as-trigger-hint">· {{ selectedOption.hint }}</span>
        </ng-container>
        <ng-template #placeholderTpl>
          <span class="as-trigger-text">{{ placeholder }}</span>
        </ng-template>
      </span>

      <span class="as-trigger-right">
        <button
          *ngIf="clearable && selectedOption && !disabled"
          type="button"
          class="as-clear-btn"
          title="Limpiar selección"
          (click)="$event.stopPropagation(); clearValue()">
          ✕
        </button>
        <span class="as-chevron" [class.open]="isOpen">▼</span>
      </span>
    </button>

    <!-- ── Modal ── -->
    <div class="as-backdrop" *ngIf="isOpen" (click)="closeModal()">
      <div
        class="as-modal"
        role="dialog"
        aria-modal="true"
        (click)="$event.stopPropagation()">

        <!-- Header -->
        <div class="as-header">
          <h3>
            <span *ngIf="icon">{{ icon }}</span>
            {{ resolvedModalTitle }}
          </h3>
          <button type="button" class="as-close-btn" (click)="closeModal()">✕</button>
        </div>

        <!-- Search bar (solo si hay muchas opciones o searchable=true) -->
        <div class="as-search-bar" *ngIf="showSearch">
          <div class="as-search-wrap">
            <span class="as-search-icon">⌕</span>
            <input
              #searchInput
              type="text"
              class="as-search-input"
              [placeholder]="'Buscar ' + (label || 'opción') + '...'"
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterOptions($event)"
              autocomplete="off"
              autofocus />
            <button
              *ngIf="searchTerm"
              type="button"
              class="as-search-clear"
              (click)="filterOptions(''); searchInput.value=''">✕</button>
          </div>
        </div>

        <!-- Count -->
        <div class="as-count" *ngIf="showSearch">
          <span *ngIf="searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }}
          </span>
          <span *ngIf="!searchTerm">
            {{ filtered.length }} opci{{ filtered.length !== 1 ? 'ones' : 'ón' }} disponible{{ filtered.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <!-- Options list -->
        <div class="as-body">

          <div class="as-empty" *ngIf="filtered.length === 0">
            <span class="as-empty-icon">🔎</span>
            <p>No hay opciones<ng-container *ngIf="searchTerm"> para "{{ searchTerm }}"</ng-container></p>
          </div>

          <ul class="as-list" *ngIf="filtered.length > 0">
            <li
              class="as-option"
              [class.as-option--selected]="isSelected(opt)"
              [class.as-option--disabled]="opt.disabled ?? false"
              *ngFor="let opt of filtered"
              (click)="selectOption(opt)">

              <span *ngIf="opt.icon" class="as-option-icon">{{ opt.icon }}</span>

              <div class="as-option-info">
                <span class="as-option-label">{{ opt.label }}</span>
                <span *ngIf="opt.hint" class="as-option-hint">{{ opt.hint }}</span>
              </div>

              <span class="as-selected-check">✓</span>
              <span class="as-arrow">→</span>
            </li>
          </ul>
        </div>

        <!-- Footer -->
        <div class="as-footer">
          <span class="as-footer-hint"><kbd>Esc</kbd> para cerrar</span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="closeModal()">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AppSelectComponent<T = string | number> implements OnInit, OnChanges {

  // ── Inputs ──────────────────────────────────────────────────────
  @Input() options:     SelectOption<T>[] = [];
  @Input() value:       T | null = null;
  /** Alias para integración con formularios reactivos (mismo que value) */
  @Input() formValue:   T | null = null;
  @Input() placeholder  = '— Seleccione —';
  @Input() label        = '';
  @Input() required     = false;
  @Input() disabled     = false;
  @Input() clearable    = true;
  @Input() invalid      = false;
  /** Fuerza mostrar buscador. Por defecto: true si options.length > 6 */
  @Input() searchable:  boolean | null = null;
  @Input() modalTitle   = '';
  @Input() icon         = '';

  // ── Outputs ─────────────────────────────────────────────────────
  @Output() valueChange  = new EventEmitter<T | null>();
  @Output() optionChange = new EventEmitter<SelectOption<T> | null>();

  // ── State ────────────────────────────────────────────────────────
  isOpen        = false;
  searchTerm    = '';
  filtered:     SelectOption<T>[] = [];
  selectedOption: SelectOption<T> | null = null;

  private cdr = inject(ChangeDetectorRef);

  // ── Derived ──────────────────────────────────────────────────────
  get resolvedModalTitle(): string {
    return this.modalTitle || this.label || 'Seleccionar opción';
  }

  get showSearch(): boolean {
    if (this.searchable !== null) return this.searchable;
    return this.options.length > 6;
  }

  get triggerIcon(): string {
    if (this.selectedOption?.icon) return this.selectedOption.icon;
    if (this.icon) return this.icon;
    return '';
  }

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit(): void {
    this.syncSelected();
    this.filtered = [...this.options];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      this.filtered = [...this.options];
      this.syncSelected();
    }
    if (changes['value'] || changes['formValue']) {
      this.syncSelected();
    }
  }

  private syncSelected(): void {
    const v = this.formValue ?? this.value;
    this.selectedOption = v !== null && v !== undefined
      ? (this.options.find(o => o.value === v) ?? null)
      : null;
    this.cdr.markForCheck();
  }

  // ── Modal control ────────────────────────────────────────────────
  openModal(): void {
    if (this.disabled) return;
    this.isOpen    = true;
    this.searchTerm = '';
    this.filtered  = [...this.options];
    this.cdr.markForCheck();
  }

  closeModal(): void {
    this.isOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.isOpen) this.closeModal(); }

  // ── Options ──────────────────────────────────────────────────────
  filterOptions(term: string): void {
    this.searchTerm = term;
    const q = term.toLowerCase().trim();
    this.filtered = q
      ? this.options.filter(o =>
          o.label.toLowerCase().includes(q) ||
          (o.hint?.toLowerCase().includes(q) ?? false) ||
          String(o.value).toLowerCase().includes(q)
        )
      : [...this.options];
    this.cdr.markForCheck();
  }

  selectOption(opt: SelectOption<T>): void {
    if (opt.disabled) return;
    this.selectedOption = opt;
    this.isOpen = false;
    this.valueChange.emit(opt.value);
    this.optionChange.emit(opt);
    this.cdr.markForCheck();
  }

  clearValue(): void {
    this.selectedOption = null;
    this.valueChange.emit(null);
    this.optionChange.emit(null);
    this.cdr.markForCheck();
  }

  isSelected(opt: SelectOption<T>): boolean {
    return this.selectedOption?.value === opt.value;
  }
}