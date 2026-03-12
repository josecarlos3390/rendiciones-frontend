import { Directive, ElementRef, Renderer2, OnInit, OnDestroy } from '@angular/core';

/**
 * Soluciona el clipping del dropdown por `overflow: hidden` en `.table-wrapper`.
 *
 * Usa MutationObserver para detectar cuando Angular agrega/quita la clase `open`
 * en el host (div.row-menu-wrap). Al abrirse, teletransporta el `.row-dropdown`
 * al <body> con `position: fixed` y coordenadas calculadas — escapa de cualquier
 * contenedor con overflow. Al cerrarse, lo devuelve a su lugar original.
 *
 * Uso: <div class="row-menu-wrap" dropdownPosition ...>
 */
@Directive({
  selector: '[dropdownPosition]',
  standalone: true,
})
export class DropdownPositionDirective implements OnInit, OnDestroy {

  private observer!: MutationObserver;
  private dropdown: HTMLElement | null = null;
  private originalParent: HTMLElement | null = null;
  private originalNextSibling: Node | null = null;

  private onScroll = () => this.reposition();
  private onResize = () => this.reposition();

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const wrap = this.el.nativeElement;

    this.observer = new MutationObserver(() => {
      if (wrap.classList.contains('open')) {
        requestAnimationFrame(() => this.teleportOut());
      } else {
        this.teleportBack();
      }
    });

    this.observer.observe(wrap, { attributes: true, attributeFilter: ['class'] });
  }

  /** Mueve el dropdown al <body> con position:fixed */
  private teleportOut(): void {
    const wrap = this.el.nativeElement;
    const dd = wrap.querySelector<HTMLElement>('.row-dropdown');
    if (!dd || this.dropdown) return; // ya teleportado

    this.dropdown = dd;
    this.originalParent = dd.parentElement;
    this.originalNextSibling = dd.nextSibling;

    // Mover al body
    document.body.appendChild(dd);

    // Estilos fixed
    this.renderer.setStyle(dd, 'position', 'fixed');
    this.renderer.setStyle(dd, 'z-index', '9999');
    this.renderer.setStyle(dd, 'display', 'block');
    this.renderer.removeStyle(dd, 'right');
    this.renderer.removeStyle(dd, 'bottom');

    this.reposition();

    window.addEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.onResize);
  }

  /** Devuelve el dropdown a su lugar en el DOM original */
  private teleportBack(): void {
    const dd = this.dropdown;
    if (!dd) return;

    this.renderer.removeStyle(dd, 'position');
    this.renderer.removeStyle(dd, 'z-index');
    this.renderer.removeStyle(dd, 'display');
    this.renderer.removeStyle(dd, 'top');
    this.renderer.removeStyle(dd, 'left');

    if (this.originalParent) {
      this.originalParent.insertBefore(dd, this.originalNextSibling);
    }

    this.dropdown = null;
    this.originalParent = null;
    this.originalNextSibling = null;

    window.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.onResize);
  }

  private reposition(): void {
    const wrap = this.el.nativeElement;
    const dd = this.dropdown;
    if (!dd) return;

    const btnRect  = wrap.getBoundingClientRect();
    const ddHeight = dd.offsetHeight || 100;
    const ddWidth  = dd.offsetWidth  || 200;

    const spaceBelow = window.innerHeight - btnRect.bottom;
    const openUp     = spaceBelow < ddHeight + 12;

    const top  = openUp
      ? btnRect.top - ddHeight - 6
      : btnRect.bottom + 6;

    const left = Math.min(
      btnRect.right - ddWidth,
      window.innerWidth - ddWidth - 8
    );

    this.renderer.setStyle(dd, 'top',  `${top}px`);
    this.renderer.setStyle(dd, 'left', `${Math.max(8, left)}px`);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.teleportBack();
  }
}