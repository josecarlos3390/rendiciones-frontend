import { Component, EventEmitter, OnInit, OnDestroy, Output, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';
import { AppConfigService } from '../../../services/app-config.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    private cdr: ChangeDetectorRef,
    public appConfig: AppConfigService,
  ) {}

  // ── Modo offline ──────────────────────────────────────
  get isOffline(): boolean {
    return this.appConfig.isOffline;
  }

  // ── Datos del usuario ────────────────────────────────
  get userName(): string {
    return this.auth.user?.name ?? this.auth.user?.username ?? 'Usuario';
  }

  get userInitial(): string {
    return (this.auth.user?.name ?? this.auth.user?.username ?? 'U')[0].toUpperCase();
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

  clearSearch() {
    this.searchQuery    = '';
    this._searchCache   = '';
    this._filteredItems = [];
  }

  get navItems(): { label: string; route: string; icon: string; section: string }[] {
    const base = [
      { label: 'Dashboard',        route: '/dashboard',        icon: 'dashboard', section: 'General' },
      { label: 'Nueva Rendición',  route: '/rend-m',           icon: 'rend',      section: 'Rendiciones' },
      { label: 'Usuarios',         route: '/users',            icon: 'admin',     section: 'Administración' },
      { label: 'Perfiles',         route: '/perfiles',         icon: 'admin',     section: 'Administración' },
      { label: 'Documentos',       route: '/documentos',       icon: 'admin',     section: 'Administración' },
      { label: 'Usuario/Perfil',   route: '/permisos',         icon: 'admin',     section: 'Administración' },
      { label: 'Cuentas Cabecera', route: '/cuentas-cabecera', icon: 'admin',     section: 'Administración' },
      { label: 'Lista de Cuentas', route: '/cuentas-lista',    icon: 'admin',     section: 'Administración' },
    ];

    if (this.isOffline) {
      base.push(
        { label: 'Cuentas Contables', route: '/offline/cuentas',     icon: 'offline', section: 'Datos Offline' },
        { label: 'Dimensiones',       route: '/offline/dimensiones',  icon: 'offline', section: 'Datos Offline' },
        { label: 'Normas de Reparto', route: '/offline/normas',       icon: 'offline', section: 'Datos Offline' },
        { label: 'Proveedores',       route: '/offline/proveedores',  icon: 'offline', section: 'Datos Offline' },
        { label: 'Clientes',          route: '/offline/clientes',     icon: 'offline', section: 'Datos Offline' },
        { label: 'Empleados',         route: '/offline/empleados',    icon: 'offline', section: 'Datos Offline' },
      );
    }

    return base;
  }

  private _filteredItems: { label: string; route: string; icon: string; section: string }[] = [];
  private _groupedResults: { [key: string]: { label: string; route: string; icon: string; section: string }[] } = {};
  private _searchCache = '';

  get filteredItems() {
    const query = (this.searchQuery || '').toLowerCase().trim();
    if (query === this._searchCache) return this._filteredItems;
    this._searchCache   = query;
    if (!query) {
      this._filteredItems  = [];
      this._groupedResults = {};
      return [];
    }
    this._filteredItems = this.navItems.filter(item =>
      item.label.toLowerCase().includes(query),
    );
    this._groupedResults = {};
    this._filteredItems.forEach(item => {
      if (!this._groupedResults[item.section]) this._groupedResults[item.section] = [];
      this._groupedResults[item.section].push(item);
    });
    return this._filteredItems;
  }

  get groupedSearchResults() {
    this.filteredItems;
    return this._groupedResults;
  }

  // ── Tema ─────────────────────────────────────────────
  get isDark(): boolean { return this.themeService.isDark; }
  toggleTheme() { this.themeService.toggle(); }

  // ── Controles ────────────────────────────────────────
  get isMobile(): boolean { return window.innerWidth <= 768; }

  get menuCollapsed(): boolean { return this.isMobile ? false : this.collapsed; }

  toggleSidebar() {
    if (this.isMobile) return;
    this.collapsed = !this.collapsed;
    if (this.collapsed) this.openMenu = null;
    this.toggle.emit(this.collapsed);
  }

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    if (this.collapsed) this.openMenu = null;
    this.toggle.emit(this.collapsed);
  }

  private routerSub?: Subscription;

  ngOnInit() {
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.mobileOpen) this.closeMobile();
        this.searchQuery     = '';
        this._searchCache    = '';
        this._filteredItems  = [];
        this._groupedResults = {};
        this.cdr.markForCheck();
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