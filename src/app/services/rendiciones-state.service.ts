import { Injectable } from '@angular/core';

/**
 * Servicio de estado mínimo para persistir el perfil activo
 * entre navegaciones rend-m ↔ rend-d.
 *
 * Evita el problema de query params + ngOnInit no re-ejecutándose
 * cuando Angular reutiliza la instancia del componente.
 */
@Injectable({ providedIn: 'root' })
export class RendicionesStateService {
  /** ID del perfil que estaba activo al navegar a rend-d */
  perfilActivoId: number | null = null;
}