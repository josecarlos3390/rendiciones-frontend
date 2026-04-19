/**
 * Types globales y utilitarios
 */

// ═══════════════════════════════════════════════════════════════
// TYPES UTILITARIOS
// ═══════════════════════════════════════════════════════════════

/** Hace opcionales todas las propiedades excepto las especificadas */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/** Hace requeridas todas las propiedades excepto las especificadas */
export type RequiredExcept<T, K extends keyof T> = Required<T> & Partial<Pick<T, K>>;

/** Extrae el tipo de un elemento de array */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/** Tipos de valores de un objeto */
export type ValueOf<T> = T[keyof T];

/** Keys que son de tipo string */
export type StringKeys<T> = keyof T & string;

/** Nullable para todos los campos */
export type Nullable<T> = { [K in keyof T]: T[K] | null };

/** Deep Partial (recursivo) */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ═══════════════════════════════════════════════════════════════
// TYPES DE DOMINIO COMPARTIDOS
// ═══════════════════════════════════════════════════════════════

/** Respuesta paginada de API */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Parámetros de paginación */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Filtros de búsqueda */
export interface SearchFilters {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: number | string;
}

/** Opción de select/dropdown */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
}

/** Configuración de columna de tabla */
export interface TableColumn<T = any> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => string;
}

/** Acción de tabla */
export interface TableAction {
  id: string;
  label: string;
  icon?: string;
  class?: string;
  visible?: (row: any) => boolean;
  disabled?: (row: any) => boolean;
}

/** Estado de carga */
export interface LoadingState {
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

/** Resultado de operación */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Configuración de modal */
export interface ModalConfig {
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  backdrop?: boolean;
}

/** Configuración de confirmación */
export interface ConfirmConfig {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmClass?: 'primary' | 'danger' | 'warning';
}

// ═══════════════════════════════════════════════════════════════
// TYPES DE FORMULARIOS
// ═══════════════════════════════════════════════════════════════

/** Errores de validación de campo */
export type FieldErrors = Record<string, string[]>;

/** Estado de formulario */
export interface FormState {
  dirty: boolean;
  touched: boolean;
  valid: boolean;
  submitting: boolean;
  errors: FieldErrors;
}

/** Cambio de valor de campo */
export interface FieldChange<T = any> {
  field: string;
  value: T;
  previousValue?: T;
}

// ═══════════════════════════════════════════════════════════════
// TYPES DE API
// ═══════════════════════════════════════════════════════════════

/** Respuesta estándar de API */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

/** Error de API */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  method: string;
}

/** Configuración de request */
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  silent?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TYPES DE EVENTOS
// ═══════════════════════════════════════════════════════════════

/** Evento de selección */
export interface SelectionEvent<T> {
  selected: T[];
  current: T | null;
}

/** Evento de cambio de página */
export interface PageChangeEvent {
  page: number;
  pageSize: number;
}

/** Evento de ordenamiento */
export interface SortEvent {
  field: string;
  order: 'asc' | 'desc' | null;
}

/** Evento de filtro */
export interface FilterEvent {
  field: string;
  value: any;
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
}
