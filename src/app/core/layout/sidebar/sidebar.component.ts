import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  collapsed  = false;
  mobileOpen = false;
  openMenu: string | null = null;
  searchQuery = '';

  @Output() toggle = new EventEmitter<boolean>();

  constructor(
    public auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  // ── Datos del usuario ────────────────────────────────
  get userName(): string {
    return this.auth.user?.name ?? this.auth.user?.email ?? 'Usuario';
  }

  get userInitial(): string {
    return (this.auth.user?.name ?? this.auth.user?.email ?? 'U')[0].toUpperCase();
  }

  get userRole(): string {
    return this.auth.role === 'ADMIN' ? 'Administrador' : 'Usuario';
  }

  // ── Búsqueda ─────────────────────────────────────────
  get isSearching(): boolean {
    return !!this.searchQuery && this.searchQuery.trim().length > 0;
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery = value;
  }

  // Items de navegación para búsqueda
  navItems: { label: string; route: string; icon: string; section: string }[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', section: 'General' },
    { label: 'Usuarios', route: '/users', icon: 'admin', section: 'Administración' },
  ];

  private _filteredItems: { label: string; route: string; icon: string; section: string }[] = [];
  private _groupedResults: { [key: string]: { label: string; route: string; icon: string; section: string }[] } = {};
  private _searchCache = '';

  get filteredItems() {
    const query = (this.searchQuery || '').toLowerCase().trim();
    if (query === this._searchCache) {
      return this._filteredItems;
    }
    this._searchCache = query;
    if (!query) {
      this._filteredItems = [];
      this._groupedResults = {};
      return [];
    }
    this._filteredItems = this.navItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
    
    this._groupedResults = {};
    this._filteredItems.forEach(item => {
      if (!this._groupedResults[item.section]) {
        this._groupedResults[item.section] = [];
      }
      this._groupedResults[item.section].push(item);
    });
    return this._filteredItems;
  }

  get groupedSearchResults() {
    // Fuerza la evaluación de filteredItems para asegurar cache
    this.filteredItems;
    return this._groupedResults;
  }

  // ── Tema ─────────────────────────────────────────────
  get isDark(): boolean {
    return this.themeService.isDark;
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  // ── Controles ────────────────────────────────────────
  get isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  // En móvil collapsed no debe bloquear la apertura de submenús
  get menuCollapsed(): boolean {
    return this.isMobile ? false : this.collapsed;
  }

  toggleSidebar() {
    if (this.isMobile) return;
    this.collapsed = !this.collapsed;
    if (this.collapsed) this.openMenu = null;
    this.toggle.emit(this.collapsed);
  }

  // Método público para togglear desde el layout
  toggleCollapse() {
    this.collapsed = !this.collapsed;
    if (this.collapsed) this.openMenu = null;
    this.toggle.emit(this.collapsed);
  }

  private routerSub?: Subscription;

  ngOnInit() {
    // Auto-cerrar sidebar al navegar (evita overlay permanente bloqueando scroll)
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.mobileOpen) this.closeMobile();
      });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.setBodyScroll(true);
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    this.setBodyScroll(!this.mobileOpen);
  }

  closeMobile() {
    this.mobileOpen = false;
    this.setBodyScroll(true);
  }

  /** Bloquea/desbloquea el scroll del body cuando el drawer móvil está abierto */
  private setBodyScroll(enabled: boolean) {
    document.body.style.overflow = enabled ? '' : 'hidden';
  }

  toggleMenu(menu: string) {
    if (this.menuCollapsed) return;
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}