import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { roleGuard } from './auth/role.guard';
import { LayoutComponent } from './core/layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component')
            .then(m => m.ProfileComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'documentos',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/documentos/documentos.component')
            .then(m => m.DocumentosComponent)
      },
      {
        path: 'permisos',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/permisos/permisos.component')
            .then(m => m.PermisosComponent)
      },
      {
        path: 'cuentas-cabecera',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/cuentas-cabecera/cuentas-cabecera.component')
            .then(m => m.CuentasCabeceraComponent)
      },
      {
        path: 'cuentas-lista',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/cuentas-lista/cuentas-lista.component')
            .then(m => m.CuentasListaComponent)
      },
      {
        path: 'perfiles',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/perfiles/perfiles.component')
            .then(m => m.PerfilesComponent)
      },
      {
        path: 'users',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/users/users.component')
            .then(m => m.UsersComponent)
      },
      {
        path: 'rend-m',
        loadComponent: () =>
          import('./pages/rend-m/rend-m.component')
            .then(m => m.RendMComponent)
      },
      {
        path: 'rend-m/:id/detalle',
        loadComponent: () =>
          import('./pages/rend-d/rend-d.component')
            .then(m => m.RendDComponent)
      },

      // ── Datos Offline (solo visibles cuando APP_MODE=OFFLINE) ────────────
      {
        path: 'offline/cuentas',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/cuentas/offline-cuentas.component')
            .then(m => m.OfflineCuentasComponent)
      },
      {
        path: 'offline/dimensiones',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/dimensiones/offline-dimensiones.component')
            .then(m => m.OfflineDimensionesComponent)
      },
      {
        path: 'offline/normas',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/normas/offline-normas.component')
            .then(m => m.OfflineNormasComponent)
      },
      {
        path: 'offline/proveedores',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/entidades/offline-entidades.component')
            .then(m => m.OfflineEntidadesComponent),
        data: { tipo: 'PL', titulo: 'Proveedores' }
      },
      {
        path: 'offline/clientes',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/entidades/offline-entidades.component')
            .then(m => m.OfflineEntidadesComponent),
        data: { tipo: 'CL', titulo: 'Clientes' }
      },
      {
        path: 'offline/empleados',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/offline/entidades/offline-entidades.component')
            .then(m => m.OfflineEntidadesComponent),
        data: { tipo: 'EL', titulo: 'Empleados' }
      },
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];