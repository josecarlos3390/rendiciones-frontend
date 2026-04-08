/**
 * Modelo de Norma de Reparto para modo OFFLINE
 */

export interface Norma {
  factorCode: string;     // NR_FACTOR_CODE
  descripcion: string;    // NR_DESCRIPCION
  dimension: number;      // NR_DIMENSION
  activa: boolean;        // NR_ACTIVA
}

/**
 * Norma con información de la dimensión
 */
export interface NormaConDimension extends Norma {
  dimensionName: string;  // DIM_NAME
}

/**
 * Payload para crear una norma
 */
export interface CrearNormaPayload {
  factorCode: string;
  descripcion: string;
  dimension: number;
  activa?: boolean;
}

/**
 * Payload para actualizar una norma
 */
export type ActualizarNormaPayload = Partial<{
  descripcion: string;
  dimension: number;
  activa: boolean;
}>;

/**
 * Filtros para búsqueda de normas
 */
export interface NormaFiltro {
  factorCode?: string;
  descripcion?: string;
  dimension?: number;
  activa?: boolean;
  sortBy?: 'factorCode' | 'descripcion' | 'dimension' | 'activa';
  sortOrder?: 'asc' | 'desc';
}
