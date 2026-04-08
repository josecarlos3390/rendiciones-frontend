/**
 * Modelo de Dimensión para modo OFFLINE
 */

export interface Dimension {
  code: number;           // DIM_CODE
  name: string;           // DIM_NAME
  descripcion: string;    // DIM_DESCRIPCION
  activa: boolean;        // DIM_ACTIVA
}

/**
 * Payload para crear una dimensión
 */
export interface CrearDimensionPayload {
  code: number;
  name: string;
  descripcion?: string;
  activa?: boolean;
}

/**
 * Payload para actualizar una dimensión
 */
export type ActualizarDimensionPayload = Partial<{
  name: string;
  descripcion: string;
  activa: boolean;
}>;

/**
 * Filtros para búsqueda de dimensiones
 */
export interface DimensionFiltro {
  code?: number;
  name?: string;
  activa?: boolean;
  sortBy?: 'code' | 'name' | 'activa';
  sortOrder?: 'asc' | 'desc';
}
