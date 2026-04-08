/**
 * Modelo de Proyecto para gestión en modo OFFLINE
 */

export interface Proyecto {
  code: string;
  name: string;
  activo: boolean;
}

/**
 * Payload para crear un proyecto
 */
export interface CrearProyectoPayload {
  code: string;
  name: string;
  activo?: boolean;
}

/**
 * Payload para actualizar un proyecto
 */
export type ActualizarProyectoPayload = Partial<{
  name: string;
  activo: boolean;
}>;

/**
 * Filtros para búsqueda de proyectos
 */
export interface ProyectoFiltro {
  code?: string;
  name?: string;
  activo?: boolean;
  sortBy?: 'code' | 'name' | 'activo';
  sortOrder?: 'asc' | 'desc';
}
