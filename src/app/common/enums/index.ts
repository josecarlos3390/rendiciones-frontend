/**
 * Enums globales del sistema de rendiciones
 * 
 * Convención: Usar PascalCase para enums, UPPER_SNAKE_CASE para valores
 */

/** Estados de una rendición (mapea U_Estado de la BD) */
export enum EstadoRendicion {
  ABIERTO = 1,
  CERRADO = 2,
  ELIMINADO = 3,
  ENVIADO = 4,
  SINCRONIZADO = 5,
  ERROR = 6,
  APROBADO = 7,
}

/** Tipo de cálculo para documentos */
export enum TipoCalculo {
  GROSSING_UP = 0,    // Aumenta el importe
  GROSSING_DOWN = 1,  // Disminuye el importe
}

/** Tipo de documento SAP */
export enum TipoDocSap {
  FACTURA = 1,
  RECIBO = 4,
  ALQUILER = 10,
  OTRO = 99,
}

/** Roles de usuario */
export enum RolUsuario {
  ADMIN = 'ADMIN',
  USER = 'USER',
  APPROVER = 'APPROVER',
  VIEWER = 'VIEWER',
}

/** Modos de operación */
export enum ModoOperacion {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

/** Estados de sincronización */
export enum EstadoSync {
  PENDIENTE = 'PENDIENTE',
  SINCRONIZADO = 'SINCRONIZADO',
  ERROR = 'ERROR',
}

/** Fuentes de datos para facturas */
export enum FuenteFactura {
  SIAT = 'siat',
  IA_CLAUDE = 'ai_claude',
  IA_OPENAI = 'ai_openai',
  MANUAL = 'manual',
}

/** Tipos de acción en tablas */
export enum TipoAccion {
  VER = 'ver',
  EDITAR = 'editar',
  ELIMINAR = 'eliminar',
  APROBAR = 'aprobar',
  RECHAZAR = 'rechazar',
  IMPRIMIR = 'imprimir',
  SINCRONIZAR = 'sincronizar',
}
