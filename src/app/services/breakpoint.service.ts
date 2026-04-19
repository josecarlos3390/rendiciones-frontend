import { Injectable, NgZone } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';
import { map, startWith, distinctUntilChanged, shareReplay } from 'rxjs/operators';

/**
 * Servicio centralizado para detectar breakpoints de viewport.
 *
 * Expone un observable `isMobile$` que emite `true` cuando el ancho
 * de la ventana es menor a 768px.
 *
 * Uso:
 *   this.breakpoint.isMobile$.subscribe(isMobile => {
 *     this.isMobile = isMobile;
 *     this.cdr.markForCheck();
 *   });
 */
@Injectable({ providedIn: 'root' })
export class BreakpointService {
  readonly isMobile$: Observable<boolean>;

  constructor(private zone: NgZone) {
    this.isMobile$ = this.zone.runOutsideAngular(() =>
      fromEvent(window, 'resize').pipe(
        startWith(null),
        map(() => window.innerWidth < 768),
        distinctUntilChanged(),
        shareReplay(1),
      ),
    );
  }
}
