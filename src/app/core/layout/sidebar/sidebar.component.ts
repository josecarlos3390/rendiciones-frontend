import { Component, EventEmitter, OnInit, OnDestroy, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../auth/auth.service';
import { AprobacionesService } from '../../../services/aprobaciones.service';
import { IntegracionService } from '../../../services/integracion.service';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { ThemeService } from '../../theme/theme.service';

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

  pendientesCount  = 0;
  integracionCount = 0;
  private pollingSubscription?: Subscription;
  private integracionSub?: Subscription;

  constructor(
    public  auth:             AuthService,
    private aprobacionesSvc:  AprobacionesService,
    private integracionSvc:   IntegracionService,
    private router:           Router,
    private themeService:     ThemeService,
    private cdr:              ChangeDetectorRef,
  ) {}

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

  navItems: { label: string; route: string; icon: string; section: string; adminOnly?: boolean }[] = [
    { label: 'Dashboard',         route: '/dashboard',        icon: 'dashboard', section: 'General' },
    { label: 'Nueva Rendición',   route: '/rend-m',           icon: 'rend',      section: 'Rendiciones' },
    { label: 'Aprobaciones',      route: '/aprobaciones',     icon: 'rend',      section: 'Rendiciones' },
    { label: 'Integración ERP',   route: '/integracion',      icon: 'rend',      section: 'Rendiciones' },
    { label: 'Usuarios',          route: '/users',            icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Perfiles',          route: '/perfiles',         icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Documentos',        route: '/documentos',       icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Usuario/Perfil',    route: '/permisos',         icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Cuentas Cabecera',  route: '/cuentas-cabecera', icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Lista de Cuentas',  route: '/cuentas-lista',    icon: 'admin',     section: 'Administración', adminOnly: true },
    { label: 'Mapeo SAP',         route: '/rend-cmp',         icon: 'admin',     section: 'Administración', adminOnly: true },
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
      this._filteredItems  = [];
      this._groupedResults = {};
      return [];
    }
    this._filteredItems = this.navItems.filter(item => {
      if (item.adminOnly && !this.auth.isAdmin) return false;
      return item.label.toLowerCase().includes(query);
    });
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

  get menuCollapsed(): boolean {
    return this.isMobile ? false : this.collapsed;
  }

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
    this._startPolling();
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
    this.pollingSubscription?.unsubscribe();
    this.integracionSub?.unsubscribe();
    this.setBodyScroll(true);
  }

  private _startPolling() {
    // Polling aprobaciones pendientes
    this.pollingSubscription = interval(60000).pipe(
      startWith(0),
      switchMap(() => this.aprobacionesSvc.countPendientes()),
    ).subscribe({
      next: (res) => {
        this.pendientesCount = res.count;
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    // Polling integración pendientes
    this.integracionSub = interval(60000).pipe(
      startWith(0),
      switchMap(() => this.integracionSvc.countPendientes()),
    ).subscribe({
      next: (res) => {
        this.integracionCount = res.count;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
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