import { Directive, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

/**
 * Directiva de debounce para inputs de búsqueda
 * Evita disparar búsquedas en cada tecla presionada
 * 
 * Uso:
 * <input 
 *   type="text" 
 *   [appDebounce]="300"
 *   (debounceChange)="buscar($event)">
 * 
 * O con ngModel:
 * <input 
 *   type="text" 
 *   [(ngModel)]="searchTerm"
 *   [appDebounce]="300"
 *   (debounceChange)="buscar($event)">
 */
@Directive({
  selector: '[appDebounce]',
  standalone: true,
  host: {
    '(input)': 'onInput($event)',
    '(keyup)': 'onKeyup($event)'
  }
})
export class DebounceDirective implements OnInit, OnDestroy {
  @Input() appDebounce = 300; // Tiempo en ms, default 300ms
  @Input() debounceTrigger: 'input' | 'keyup' | 'change' = 'input';
  
  @Output() debounceChange = new EventEmitter<string>();
  @Output() debounceEnter = new EventEmitter<string>();

  private inputSubject = new Subject<string>();
  private subscription?: Subscription;

  ngOnInit(): void {
    this.subscription = this.inputSubject.pipe(
      debounceTime(this.appDebounce),
      distinctUntilChanged()
    ).subscribe(value => {
      this.debounceChange.emit(value);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onInput(event: Event): void {
    if (this.debounceTrigger === 'input') {
      const value = (event.target as HTMLInputElement).value;
      this.inputSubject.next(value);
    }
  }

  onKeyup(event: KeyboardEvent): void {
    // Emitir inmediatamente al presionar Enter
    if (event.key === 'Enter') {
      const value = (event.target as HTMLInputElement).value;
      this.debounceChange.emit(value);
      this.debounceEnter.emit(value);
      return;
    }

    if (this.debounceTrigger === 'keyup') {
      const value = (event.target as HTMLInputElement).value;
      this.inputSubject.next(value);
    }
  }

  // Método para forzar la emisión (útil al limpiar búsqueda)
  emit(value: string): void {
    this.inputSubject.next(value);
  }
}
