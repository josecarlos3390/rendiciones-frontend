import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Componente de búsqueda con debounce integrado
 * Reemplaza los inputs de búsqueda manuales en toda la app
 * 
 * Uso:
 * <app-search-input
 *   placeholder="Buscar rendiciones..."
 *   [debounceTime]="300"
   [(search)]="searchTerm"
 *   (searchChange)="aplicarFiltro($event)">
 * </app-search-input>
 */
@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
      </svg>
      
      <input
        type="text"
        class="search-input"
        [placeholder]="placeholder"
        [(ngModel)]="value"
        (input)="onInput($event)"
        (keyup.enter)="onEnter()"
        [disabled]="disabled">
      
      <!-- Botón de limpiar -->
      <button 
        *ngIf="value && !isSearching"
        type="button"
        class="clear-btn"
        (click)="clear()"
        title="Limpiar búsqueda">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      
      <!-- Spinner de búsqueda -->
      <span class="search-spinner" *ngIf="isSearching">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="31.416" stroke-dashoffset="10">
            <animateTransform attributeName="transform" type="rotate" 
                              from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </span>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; min-width: 0; }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      width: 18px;
      height: 18px;
      color: var(--text-muted);
      pointer-events: none;
      z-index: 1;
      flex-shrink: 0;
    }

    .search-input {
      width: 100%;
      min-width: 0;
      padding: 10px 48px 10px 40px;
      font-size: var(--text-base);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-body);
      transition: all 0.2s ease;
      box-sizing: border-box;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .search-input::placeholder {
      color: var(--text-faint);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: var(--focus-ring);
    }

    .search-input:disabled {
      background: var(--bg-faint);
      cursor: not-allowed;
      opacity: 0.6;
    }

    .clear-btn,
    .search-spinner {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      z-index: 2;
    }

    .clear-btn {
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      padding: 4px;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      background: var(--bg-subtle);
      color: var(--text-body);
    }

    .clear-btn svg {
      width: 16px;
      height: 16px;
    }

    .search-spinner {
      color: var(--color-primary);
      animation: spin 1s linear infinite;
    }

    .search-spinner svg {
      width: 16px;
      height: 16px;
    }

    @keyframes spin {
      from { transform: translateY(-50%) rotate(0deg); }
      to { transform: translateY(-50%) rotate(360deg); }
    }

    /* Variante compacta */
    :host(.compact) .search-input-wrapper {
      max-width: 280px;
    }

    :host(.compact) .search-input {
      padding: 8px 32px 8px 32px;
      font-size: var(--text-sm);
    }

    :host(.compact) .search-icon {
      left: 10px;
      width: 14px;
      height: 14px;
    }

    :host(.compact) .clear-btn,
    :host(.compact) .search-spinner {
      right: 8px;
      width: 18px;
      height: 18px;
    }

    :host(.compact) .clear-btn svg {
      width: 12px;
      height: 12px;
    }

    /* Ancho completo */
    :host(.block) .search-input-wrapper {
      max-width: none;
    }
  `]
})
export class SearchInputComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Buscar...';
  @Input() debounceTime = 300;
  @Input() disabled = false;
  @Input() isSearching = false;
  
  // Two-way binding para el valor
  @Input() set search(value: string) {
    if (value !== this._value) {
      this._value = value;
    }
  }
  get search(): string {
    return this._value;
  }
  @Output() searchChange = new EventEmitter<string>();
  
  // Eventos
  @Output() valueChange = new EventEmitter<string>();
  @Output() enterPressed = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();

  private _value = '';
  private inputSubject = new Subject<string>();
  private subscription?: Subscription;

  get value(): string {
    return this._value;
  }
  set value(val: string) {
    this._value = val;
  }

  ngOnInit(): void {
    this.subscription = this.inputSubject.pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged()
    ).subscribe(value => {
      this.valueChange.emit(value);
      this.searchChange.emit(value);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this._value = value;
    this.inputSubject.next(value);
  }

  onEnter(): void {
    // Emitir inmediatamente sin debounce
    this.enterPressed.emit(this._value);
    this.searchChange.emit(this._value);
  }

  clear(): void {
    this._value = '';
    this.inputSubject.next('');
    this.cleared.emit();
  }
}