/**
 * Constantes globales del sistema
 */

// ═══════════════════════════════════════════════════════════════
// TASAS Y CÁLCULOS FISCALES
// ═══════════════════════════════════════════════════════════════

/** Tasa estándar: 13/87 ≈ 14.9425% */
export const TAX_RATE_STANDARD = 13 / 87;

/** Tasa SIN: 13% directo */
export const TAX_RATE_SIN = 13 / 100;

/** @deprecated Usar TAX_RATE_STANDARD */
export const TAX_RATE = TAX_RATE_STANDARD;
export const SALES_TAX_RATE = TAX_RATE_STANDARD;
export const PURCHASE_TAX_RATE = TAX_RATE_STANDARD;

/** Devuelve la tasa según la configuración */
export function getTaxRate(useSin: boolean): number {
  return useSin ? TAX_RATE_SIN : TAX_RATE_STANDARD;
}

// ═══════════════════════════════════════════════════════════════
// MAPEOS DE ESTADOS
// ═══════════════════════════════════════════════════════════════

/** Mapeo legible del estado numérico de rendición
 * 1=ABIERTO, 2=CERRADO, 3=ELIMINADO, 4=ENVIADO, 5=SINCRONIZADO, 6=ERROR, 7=APROBADO
 */
export const ESTADO_LABEL: Record<number, string> = {
  1: 'ABIERTO',
  2: 'CERRADO',
  3: 'ELIMINADO',
  4: 'ENVIADO',
  5: 'SINCRONIZADO',
  6: 'ERROR SYNC',
  7: 'APROBADO',
};

/** Clases CSS para badges de estado */
export const ESTADO_CLASS: Record<number, string> = {
  1: 'status-badge status-open',
  2: 'status-badge status-secondary',
  3: 'status-badge status-deleted',
  4: 'status-badge status-confirmed',
  5: 'status-badge status-sync-ok',
  6: 'status-badge status-sync-error',
  7: 'status-badge status-closed',
};

/** Colores para estados */
export const ESTADO_COLOR: Record<number, string> = {
  1: '#10b981', // verde
  2: '#6b7280', // gris
  3: '#ef4444', // rojo
  4: '#3b82f6', // azul
  5: '#8b5cf6', // violeta
  6: '#f59e0b', // naranja
  7: '#059669', // verde oscuro
};

// ═══════════════════════════════════════════════════════════════
// OPCIONES DE SELECTORES
// ═══════════════════════════════════════════════════════════════

/** Opciones para tipo de documento SAP */
export const TIPO_DOC_SAP_OPTIONS = [
  { value: '1',  label: 'Factura' },
  { value: '4',  label: 'Recibo' },
  { value: '10', label: 'Alquiler' },
  { value: '99', label: 'Otro' },
] as const;

/** Opciones para tipo de cálculo */
export const TIPO_CALC_OPTIONS = [
  { value: '0', label: 'Grossing Up (Aumenta)' },
  { value: '1', label: 'Grossing Down (Disminuye)' },
] as const;

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIONES DE UI
// ═══════════════════════════════════════════════════════════════

/** Paginación por defecto */
export const PAGINATION_DEFAULTS = {
  pageSize: 10,
  pageSizeOptions: [5, 10, 25, 50, 100],
} as const;

/** Límites de caracteres para campos comunes */
export const MAX_LENGTH = {
  CUENTA: 25,
  NOMBRE_CUENTA: 250,
  DOCUMENTO: 20,
  AUTORIZACION: 250,
  CUF: 250,
  CONTROL: 25,
  PROVEEDOR: 200,
  COD_PROVEEDOR: 25,
  CONCEPTO: 200,
  PROYECTO: 100,
} as const;

/** Formatos de fecha */
export const DATE_FORMATS = {
  API: 'YYYY-MM-DD',
  DISPLAY: 'DD/MM/YYYY',
  DATETIME: 'DD/MM/YYYY HH:mm',
} as const;

// ═══════════════════════════════════════════════════════════════
// MENSAJES Y TEXTOS
// ═══════════════════════════════════════════════════════════════

/** Mensajes de error comunes */
export const ERROR_MESSAGES = {
  REQUIRED: 'Este campo es obligatorio',
  MIN: (min: number) => `El valor mínimo es ${min}`,
  MAX: (max: number) => `El valor máximo es ${max}`,
  MIN_LENGTH: (length: number) => `Mínimo ${length} caracteres`,
  MAX_LENGTH: (length: number) => `Máximo ${length} caracteres`,
  EMAIL: 'Ingrese un correo válido',
  NUMERIC: 'Ingrese solo números',
  POSITIVE: 'El valor debe ser positivo',
} as const;

/** Mensajes de toast/notification */
export const TOAST_MESSAGES = {
  SAVE_SUCCESS: 'Guardado correctamente',
  SAVE_ERROR: 'Error al guardar',
  DELETE_SUCCESS: 'Eliminado correctamente',
  DELETE_ERROR: 'Error al eliminar',
  SYNC_SUCCESS: 'Sincronizado correctamente',
  SYNC_ERROR: 'Error de sincronización',
  VALIDATION_ERROR: 'Por favor revise los campos',
} as const;

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIONES DE SERVICIOS EXTERNOS
// ═══════════════════════════════════════════════════════════════

/** Configuración de timeouts */
export const TIMEOUTS = {
  DEFAULT: 30000,      // 30 segundos
  UPLOAD: 120000,      // 2 minutos
  EXPORT: 60000,       // 1 minuto
  SAP_QUERY: 45000,    // 45 segundos
} as const;

/** Códigos de error HTTP */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500,
} as const;

// ═══════════════════════════════════════════════════════════════
// ICONOS SVG
// ═══════════════════════════════════════════════════════════════
export * from './icons';
