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
        path: 'tipo-doc-sap',
        loadComponent: () =>
          import('./pages/tipo-doc-sap/tipo-doc-sap.component')
            .then(m => m.TipoDocSapComponent)
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
        path: 'aprobaciones',
        loadComponent: () =>
          import('./pages/aprobaciones/aprobaciones.component')
            .then(m => m.AprobacionesComponent)
      },
      {
        path: 'integracion',
        loadComponent: () =>
          import('./pages/integracion/integracion.component')
            .then(m => m.IntegracionComponent)
      },
      {
        path: 'rend-m/:id/detalle',
        loadComponent: () =>
          import('./pages/rend-d/rend-d.component')
            .then(m => m.RendDComponent)
      },
      {
        path: 'rend-cmp',
        canActivate: [roleGuard(['ADMIN'])],
        loadComponent: () =>
          import('./pages/rend-cmp/rend-cmp.component')
            .then(m => m.RendCmpComponent)
      },
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];