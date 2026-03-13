import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  kpis:        { title: string; value: string; trend: number; theme: string; svg: SafeHtml }[] = [];
  shortcuts:   { name: string; desc: string; route: string; theme: string; svg: SafeHtml }[]   = [];
  statusItems: { name: string; status: string; label: string }[] = [];

  constructor(private auth: AuthService, private sanitizer: DomSanitizer) {
    // Las propiedades se inicializan aquí, DESPUÉS de que DomSanitizer está inyectado
    this.kpis = [
      {
        title: 'Cotizaciones abiertas', value: '—', trend: 0,
        theme: 'primary',
        svg: this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>')
      },
      {
        title: 'Pedidos de venta', value: '—', trend: 0,
        theme: 'success',
        svg: this.svg('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>')
      },
      {
        title: 'Entregas pendientes', value: '—', trend: 0,
        theme: 'warning',
        svg: this.svg('<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>')
      },
      {
        title: 'Órdenes de compra', value: '—', trend: 0,
        theme: 'cost',
        svg: this.svg('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>')
      },
    ];

    this.shortcuts = [
      {
        name: 'Nueva Rendición', desc: 'Crear cabecera de rendición', route: '/rend-m',
        theme: 'primary',
        svg: this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>')
      },
      {
        name: 'Rendiciones', desc: 'Ver todas las rendiciones', route: '/rend-m',
        theme: 'success',
        svg: this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>')
      },
      {
        name: 'Usuarios', desc: 'Administrar usuarios', route: '/users',
        theme: 'warning',
        svg: this.svg('<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>')
      },
      {
        name: 'Perfiles', desc: 'Configurar perfiles', route: '/perfiles',
        theme: 'cost',
        svg: this.svg('<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>')
      },
      {
        name: 'Documentos', desc: 'Tipos de documentos por perfil', route: '/documentos',
        theme: 'amber',
        svg: this.svg('<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/>')
      },
      {
        name: 'Permisos', desc: 'Asignar perfiles a usuarios', route: '/permisos',
        theme: 'info',
        svg: this.svg('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>')
      },
    ];

    this.statusItems = [
      { name: 'Backend API',        status: 'ok',      label: 'Operativo' },
      { name: 'Base de datos',      status: 'ok',      label: 'Operativo' },
      { name: 'Módulo de Ventas',   status: 'ok',      label: 'Activo'    },
      { name: 'Módulo de Compras',  status: 'ok',      label: 'Activo'    },
      { name: 'Autenticación JWT',  status: 'ok',      label: 'Activo'    },
      { name: 'Servidor de correo', status: 'warning', label: 'Pendiente' },
    ];
  }

  get userName(): string {
    return this.auth.user?.name ?? this.auth.user?.username ?? 'Usuario';
  }

  get today(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  private svg(raw: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}