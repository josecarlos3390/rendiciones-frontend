import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
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
    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      width: 18px;
      height: 18px;
      color: #9ca3af;
      pointer-events: none;
      z-index: 1;
    }

    .search-input {
      width: 100%;
      padding: 10px 36px 10px 40px;
      font-size: 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: white;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .search-input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    .clear-btn,
    .search-spinner {
      position: absolute;
      right: 12px;
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-btn {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      color: #9ca3af;
      transition: all 0.2s ease;
    }

    .clear-btn:hover {
      color: #4b5563;
      transform: rotate(90deg);
    }

    .clear-btn svg {
      width: 100%;
      height: 100%;
    }

    .search-spinner {
      color: #3b82f6;
      animation: spin 1s linear infinite;
    }

    .search-spinner svg {
      width: 100%;
      height: 100%;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Variante compacta */
    :host(.compact) .search-input-wrapper {
      max-width: 280px;
    }

    :host(.compact) .search-input {
      padding: 6px 32px 6px 32px;
      font-size: 13px;
    }

    :host(.compact) .search-icon {
      left: 10px;
      width: 14px;
      height: 14px;
    }

    :host(.compact) .clear-btn,
    :host(.compact) .search-spinner {
      right: 10px;
      width: 14px;
      height: 14px;
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
