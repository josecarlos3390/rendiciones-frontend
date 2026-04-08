/**
 * Modelo de Cuenta del Plan de Cuentas (COA) para modo OFFLINE
 */

export interface CuentaCOA {
  code: string;           // COA_CODE
  name: string;           // COA_NAME
  formatCode: string;     // COA_FORMAT_CODE
  asociada: boolean;      // COA_ASOCIADA
  activa: boolean;        // COA_ACTIVA
}

/**
 * Payload para crear una cuenta
 */
export interface CrearCuentaPayload {
  code: string;
  name: string;
  formatCode?: string;
  asociada?: boolean;
  activa?: boolean;
}

/**
 * Payload para actualizar una cuenta
 */
export type ActualizarCuentaPayload = Partial<{
  name: string;
  formatCode: string;
  asociada: boolean;
  activa: boolean;
}>;

/**
 * Filtros para búsqueda de cuentas
 */
export interface CoaFiltro {
  code?: string;
  name?: string;
  activa?: boolean;
  sortBy?: 'code' | 'name' | 'activa';
  sortOrder?: 'asc' | 'desc';
}
