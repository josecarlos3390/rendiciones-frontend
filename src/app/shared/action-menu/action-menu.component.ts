import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
  OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ActionMenuService } from './action-menu.service';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  cssClass?: string;
  disabled?: boolean;
  hidden?: boolean;
  divider?: boolean; // Si es true, muestra un divider antes de este item
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-menu-wrapper">
      <button
        type="button"
        class="action-menu-btn"
        (click)="toggleMenu($event)"
        [attr.aria-expanded]="isOpen"
        [attr.aria-label]="'Acciones para ' + itemLabel"
        title="Acciones">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="6" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="18" r="2"/>
        </svg>
      </button>

      <!-- Menú desplegable con posición fixed para evitar overflow de la tabla -->
      <div
        class="action-menu-dropdown"
        [class.direction-up]="menuDirection === 'up'"
        *ngIf="isOpen"
        [style.top.px]="menuPosition.top"
        [style.left.px]="menuPosition.left"
        [style.right]="menuPosition.right"
        [style.--triangle-left.px]="trianglePosition.left"
        (click)="$event.stopPropagation()"
        role="menu">
        <!-- Triángulo indicador dinámico -->
        <div class="action-menu-arrow"></div>
        <ng-container *ngFor="let action of visibleActions; let i = index">
          <!-- Divider -->
          <div class="action-menu-divider" *ngIf="action.divider && i > 0"></div>
          <!-- Item -->
          <button
            type="button"
            class="action-menu-item"
            [class]="action.cssClass"
            [disabled]="action.disabled"
            (click)="onActionClick(action.id)"
            role="menuitem">
            <span class="action-icon" *ngIf="action.icon" [innerHTML]="sanitizeIcon(action.icon)"></span>
            <span class="action-label">{{ action.label }}</span>
          </button>
        </ng-container>
      </div>
    </div>
  `,
  styleUrls: ['./action-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionMenuComponent implements OnInit, OnDestroy {
  @Input() actions: ActionMenuItem[] = [];
  @Input() itemLabel = 'elemento';
  @Output() actionClick = new EventEmitter<string>();

  isOpen = false;
  menuPosition = { top: 0, left: 0, right: 'auto' };
  trianglePosition = { left: 100 }; // Posición del triángulo en px desde la izquierda del menú
  menuDirection: 'down' | 'up' = 'down'; // Dirección de apertura del menú
  
  private closeAllSub: Subscription | null = null;

  constructor(
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private menuService: ActionMenuService,
  ) {}

  ngOnInit(): void {
    // Suscribirse para cerrar cuando otro menú se abre
    this.closeAllSub = this.menuService.closeAllObservable.subscribe(() => {
      if (this.isOpen) {
        this.closeMenu();
      }
    });
  }

  ngOnDestroy(): void {
    this.closeAllSub?.unsubscribe();
  }

  sanitizeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  get visibleActions(): ActionMenuItem[] {
    return this.actions.filter(a => !a.hidden);
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    
    const willOpen = !this.isOpen;
    
    if (willOpen) {
      // Cerrar todos los demás menús antes de abrir este
      this.menuService.closeAll();
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        this.calculatePosition();
        this.cdr.markForCheck();
      }, 0);
    }
    
    this.isOpen = willOpen;
    this.cdr.markForCheck();
  }

  closeMenu(): void {
    if (this.isOpen) {
      this.isOpen = false;
      this.cdr.markForCheck();
    }
  }

  private calculatePosition(): void {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const menuMargin = 6; // Espacio entre botón y menú
    
    // Dimensiones del menú
    const menuWidth = 200;
    const menuHeight = Math.min(this.visibleActions.length * 40 + 12, 300); // Estimación de altura
    const padding = 8; // Padding de seguridad
    
    // Calcular posición horizontal
    const buttonCenterX = rect.left + (rect.width / 2);
    let menuLeft = buttonCenterX - (menuWidth / 2);
    
    // Si el menú se sale por la derecha, alinear su borde derecho con el borde derecho del botón
    if (menuLeft + menuWidth > window.innerWidth - padding) {
      menuLeft = rect.right - menuWidth;
    }
    
    // Si aún se sale por la izquierda, alinear al borde izquierdo
    if (menuLeft < padding) {
      menuLeft = padding;
    }
    
    // Calcular posición del triángulo
    const triangleLeft = buttonCenterX - menuLeft;
    const minTriangle = 10;
    const maxTriangle = menuWidth - 10;
    this.trianglePosition.left = Math.max(minTriangle, Math.min(maxTriangle, triangleLeft));
    
    // Detectar si está cerca del borde inferior
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUp = spaceBelow < menuHeight + menuMargin && spaceAbove > menuHeight + menuMargin;
    
    if (shouldOpenUp) {
      // Abrir hacia arriba
      this.menuPosition.top = rect.top - menuHeight - menuMargin;
    } else {
      // Abrir hacia abajo (default)
      this.menuPosition.top = rect.bottom + menuMargin;
    }
    
    this.menuPosition.left = menuLeft;
    this.menuPosition.right = 'auto';
    this.menuDirection = shouldOpenUp ? 'up' : 'down';
  }

  onActionClick(actionId: string): void {
    this.actionClick.emit(actionId);
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen) {
      this.closeMenu();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    // Recalcular posición si se hace scroll mientras el menú está abierto
    if (this.isOpen) {
      this.calculatePosition();
      this.cdr.markForCheck();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    // Recalcular posición si se redimensiona la ventana
    if (this.isOpen) {
      this.calculatePosition();
      this.cdr.markForCheck();
    }
  }
}
