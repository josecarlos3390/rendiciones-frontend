import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio para coordinar el estado de los ActionMenu
 * Asegura que solo un menú esté abierto a la vez
 */
@Injectable({
  providedIn: 'root'
})
export class ActionMenuService {
  private closeAll$ = new Subject<void>();
  public closeAllObservable = this.closeAll$.asObservable();

  /**
   * Cierra todos los menús abiertos
   * Se debe llamar antes de abrir un nuevo menú
   */
  closeAll(): void {
    this.closeAll$.next();
  }
}
