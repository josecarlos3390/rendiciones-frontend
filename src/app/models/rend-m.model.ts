export interface RendM {
  U_IdRendicion:    number;
  U_IdUsuario:      string;
  U_IdPerfil:       number;
  U_NomUsuario:     string;
  U_NombrePerfil:   string;
  U_Preliminar:     string;
  U_Estado:         number;
  U_Cuenta:         string;
  U_NombreCuenta:   string;
  U_Empleado:       string;
  U_NombreEmpleado: string;
  U_FechaIni:       string;
  U_FechaFinal:     string;
  U_Monto:          number;
  U_Objetivo:       string;
  U_FechaCreacion:  string;
  U_FechaMod:       string;
  U_AUXILIAR1:      string;
  U_AUXILIAR2:      string;
  U_AUXILIAR3:      string;
}

export interface CreateRendMPayload {
  idPerfil:       number;
  cuenta:         string;
  nombreCuenta:   string;
  cuentaAsociada: string;   // 'Y' = asociada a empleado, 'N' = no asociada
  empleado?:      string;
  nombreEmpleado?: string;
  objetivo:       string;
  fechaIni:       string;
  fechaFinal:     string;
  monto:          number;
  preliminar?:    string;
  auxiliar1?:     string;
  auxiliar2?:     string;
  auxiliar3?:     string;
}

export type UpdateRendMPayload = Partial<CreateRendMPayload>;

/** Mapeo legible del estado numérico */
export const ESTADO_LABEL: Record<number, string> = {
  1: 'ABIERTO',
  2: 'CERRADO',
  3: 'APROBADO',
  4: 'ENVIADO',
  5: 'SINCRONIZADO',
  6: 'ERROR SYNC',
};
/** Clases del design system (_badges.scss) */
export const ESTADO_CLASS: Record<number, string> = {
  1: 'status-badge status-open',
  2: 'status-badge status-secondary',
  3: 'status-badge status-closed',
  4: 'status-badge status-confirmed',
  5: 'status-badge status-sync-ok',
  6: 'status-badge status-sync-error',
};