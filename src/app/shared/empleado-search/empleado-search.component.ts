import {
  Component, Input, Output, EventEmitter,
  OnInit, OnDestroy, OnChanges, SimpleChanges, HostListener,
  ChangeDetectionStrategy, ChangeDetectorRef, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Empleado {
  cardCode: string;
  cardName: string;
}

/**
 * Buscador de empleados SAP estilo modal-buscador.
 *
 * Uso:
 *   <app-empleado-search
 *     [car]="perfilEmpCar"
 *     [filtro]="perfilFiltroEmpleado"
 *     (empleadoChange)="onEmpleadoSelected($event)">
 *   </app-empleado-search>
 *
 * Con valor inicial (edición):
 *   <app-empleado-search
 *     [car]="perfilEmpCar"
 *     [filtro]="perfilFiltroEmpleado"
 *     [initialCode]="form.get('empleado')?.value"
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
    .es-trigger {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; padding: 8px 12px; min-height: 38px;
      border: 1px solid var(--border-color); border-radius: var(--radius-md, 6px);
      background: var(--bg-surface); cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit; font-size: 0.875rem;
      color: var(--text-body); width: 100%; text-align: left;
      &:hover { border-color: var(--color-primary); }
      &:focus-visible { outline: none; border-color: var(--color-primary); box-shadow: var(--focus-ring); }
      &.es-trigger--placeholder { color: var(--text-faint); }
      &.es-trigger--invalid { border-color: var(--color-danger); }
    }
    .es-trigger-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .es-trigger-code { font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--color-primary); }
    .es-trigger-name { font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .es-trigger-placeholder { font-size: 0.9rem; }
    .es-trigger-icons { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .es-clear-btn { background: none; border: none; color: var(--text-faint); cursor: pointer;
      padding: 0 2px; font-size: 13px; line-height: 1;
      &:hover { color: var(--color-danger); } }
    .es-chevron { font-size: 11px; color: var(--text-faint); }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1050; padding: 24px; animation: esFadeIn 0.15s ease; }
    @keyframes esFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .es-modal {
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-modal);
      width: min(560px, 96vw); max-height: 78vh;
      display: flex; flex-direction: column; overflow: hidden;
      animation: esSlideIn 0.2s cubic-bezier(0.34,1.36,0.64,1);
    }
    @keyframes esSlideIn { from { opacity:0; transform: translateY(12px) scale(0.97); } to { opacity:1; transform: translateY(0) scale(1); } }

    .es-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-color); flex-shrink: 0;
      h4 { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-heading); }
    }
    .es-close { background: none; border: none; font-size: 18px; color: var(--text-faint);
      cursor: pointer; padding: 4px 8px; border-radius: var(--radius-sm); line-height: 1;
      &:hover { background: var(--bg-subtle); color: var(--text-muted); } }

    .es-search-bar { padding: 14px 20px 0; flex-shrink: 0; }
    .es-search-wrap { position: relative; display: flex; align-items: center; }
    .es-search-icon { position: absolute; left: 14px; font-size: 16px; color: var(--text-faint); pointer-events: none; }
    .es-search-input {
      width: 100%; padding: 10px 40px 10px 42px;
      border: 1.5px solid var(--border-color); border-radius: var(--radius-lg, 10px);
      font-size: 14px; color: var(--text-heading); background: var(--bg-faint);
      font-family: inherit; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      &::placeholder { color: var(--text-faint); }
      &:focus { outline: none; border-color: var(--color-primary); background: var(--bg-surface); box-shadow: var(--focus-ring); }
    }
    .es-search-clear { position: absolute; right: 10px; background: none; border: none;
      color: var(--text-faint); cursor: pointer; padding: 4px 6px;
      border-radius: var(--radius-sm); font-size: 13px; line-height: 1;
      &:hover { color: var(--text-muted); background: var(--bg-subtle); } }

    .es-count { padding: 8px 20px 0; font-size: 12px; color: var(--text-faint); min-height: 22px; flex-shrink: 0; }

    .es-body { overflow-y: auto; padding: 8px 12px; }
    .es-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .es-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: var(--radius-md, 8px); cursor: pointer;
      transition: background 0.1s;
      &:hover { background: var(--bg-faint); }
    }
    .es-item-icon { font-size: 20px; flex-shrink: 0; }
    .es-item-info { flex: 1; min-width: 0; }
    .es-item-name { font-size: 0.875rem; font-weight: 600; color: var(--text-heading);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .es-item-code { font-size: 12px; font-family: var(--font-mono); color: var(--color-primary); margin-top: 1px; }

    .es-empty { display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 40px 20px; gap: 8px; color: var(--text-faint);
      .es-empty-icon { font-size: 32px; }
      p { margin: 0; font-size: 0.875rem; text-align: center; }
    }
  `],
  template: `
    <!-- Trigger -->
    <button type="button"
      class="es-trigger"
      [class.es-trigger--placeholder]="!selected"
      [class.es-trigger--invalid]="invalid"
      (click)="open()">
      <span class="es-trigger-main">
        <ng-container *ngIf="selected; else placeholder">
          <span class="es-trigger-code">{{ selected.cardCode }}</span>
          <span class="es-trigger-name">{{ selected.cardName }}</span>
        </ng-container>
        <ng-template #placeholder>
          <span class="es-trigger-placeholder">{{ placeholder_text }}</span>
        </ng-template>
      </span>
      <span class="es-trigger-icons">
        <button *ngIf="selected" type="button" class="es-clear-btn"
          (click)="$event.stopPropagation(); clear()">✕</button>
        <span class="es-chevron">▾</span>
      </span>
    </button>

    <!-- Modal -->
    <div class="modal-backdrop" *ngIf="isOpen" (click)="close()">
      <div class="es-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">

        <div class="es-header">
          <h4>Seleccionar Empleado</h4>
          <button type="button" class="es-close" (click)="close()">✕</button>
        </div>

        <div class="es-search-bar">
          <div class="es-search-wrap">
            <span class="es-search-icon">⌕</span>
            <input #searchInput type="text" class="es-search-input"
              placeholder="Buscar por código o nombre..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearch($event)"
              autofocus autocomplete="off" />
            <button *ngIf="searchTerm" type="button" class="es-search-clear"
              (click)="onSearch(''); searchInput.value=''">✕</button>
          </div>
        </div>

        <div class="es-count">
          <span *ngIf="loading">Cargando empleados SAP...</span>
          <span *ngIf="!loading && searchTerm">
            {{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }} para "<strong>{{ searchTerm }}</strong>"
          </span>
          <span *ngIf="!loading && !searchTerm">
            {{ filtered.length }} empleado{{ filtered.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="es-body">
          <div class="es-empty" *ngIf="loading">
            <span class="es-empty-icon">⏳</span>
            <p>Cargando empleados desde SAP...</p>
          </div>
          <div class="es-empty" *ngIf="!loading && filtered.length === 0">
            <span class="es-empty-icon">👤</span>
            <p>No se encontraron empleados<ng-container *ngIf="searchTerm"> para "<strong>{{ searchTerm }}</strong>"</ng-container>.</p>
          </div>
          <ul class="es-list" *ngIf="!loading && filtered.length > 0">
            <li class="es-item" *ngFor="let e of filtered" (click)="select(e)">
              <span class="es-item-icon">👤</span>
              <div class="es-item-info">
                <div class="es-item-name">{{ e.cardName }}</div>
                <div class="es-item-code">{{ e.cardCode }}</div>
              </div>
            </li>
          </ul>
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
  @Input() initialCode: string | null = null;
  @Input() invalid      = false;

  @Output() empleadoChange = new EventEmitter<Empleado | null>();

  isOpen     = false;
  loading    = false;
  searchTerm = '';
  all:      Empleado[] = [];
  filtered: Empleado[] = [];
  selected: Empleado | null = null;

  private search$  = new Subject<string>();
  private destroy$ = new Subject<void>();
  private http     = inject(HttpClient);
  private cdr      = inject(ChangeDetectorRef);

  private get api() { return `${environment.apiUrl}/sap/empleados`; }

  ngOnInit() {
    // Filtrado local con debounce
    this.search$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(term => {
      const q = term.toLowerCase().trim();
      this.filtered = q
        ? this.all.filter(e =>
            e.cardCode.toLowerCase().includes(q) ||
            e.cardName.toLowerCase().includes(q)
          )
        : this.all.slice();
      this.cdr.markForCheck();
    });

    // Cargar empleados al iniciar si hay filtro disponible y no es NOTIENE
    if (this.filtro && this.car !== 'NOTIENE') this.loadEmpleados();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Si cambia el filtro o la característica (cambio de perfil), recargar
    const filtroChanged = changes['filtro'] && !changes['filtro'].firstChange;
    const carChanged    = changes['car']    && !changes['car'].firstChange;

    if (filtroChanged || carChanged) {
      this.all      = [];
      this.filtered = [];
      // Solo consultar SAP si no es NOTIENE y hay filtro
      if (this.filtro && this.car !== 'NOTIENE') {
        this.loadEmpleados();
      } else {
        this.cdr.markForCheck();
      }
    }

    // Si cambia el initialCode y ya tenemos datos
    if (changes['initialCode'] && this.initialCode && this.all.length > 0) {
      this.restoreInitial();
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
    this.isOpen     = true;
    this.searchTerm = '';
    this.filtered   = this.all.slice();
    this.cdr.markForCheck();
  }

  private loadEmpleados() {
    this.loading = true;
    this.cdr.markForCheck();
    // Enviamos tanto `car` (U_EMP_CAR) como `filtro` (U_EMP_TEXTO) al backend
    const url = `${this.api}?car=${encodeURIComponent(this.car)}&filtro=${encodeURIComponent(this.filtro)}`;
    this.http.get<Empleado[]>(url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.all      = data;
          this.filtered = data.slice();
          this.loading  = false;
          if (this.initialCode && !this.selected) this.restoreInitial();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private restoreInitial() {
    const found = this.all.find(e => e.cardCode === this.initialCode);
    if (found) { this.selected = found; this.cdr.markForCheck(); }
  }

  close() { this.isOpen = false; this.cdr.markForCheck(); }

  onSearch(term: string) {
    this.searchTerm = term;
    const q = term.toLowerCase().trim();
    this.filtered = q
      ? this.all.filter(e =>
          e.cardCode.toLowerCase().includes(q) ||
          e.cardName.toLowerCase().includes(q)
        )
      : this.all.slice();
    this.cdr.markForCheck();
  }

  select(e: Empleado) {
    this.selected = e;
    this.isOpen   = false;
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
    this.selected   = null;
    this.all        = [];
    this.filtered   = [];
    this.searchTerm = '';
    this.cdr.markForCheck();
  }
}