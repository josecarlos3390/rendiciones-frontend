import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Login puede pre-renderizarse (no requiere sesión)
    path: 'login',
    renderMode: RenderMode.Prerender,
  },
  {
    // Todas las rutas autenticadas deben renderizarse en servidor por request
    // (no en build time, ya que dependen de sesión del usuario)
    path: '**',
    renderMode: RenderMode.Server,
  },
];
