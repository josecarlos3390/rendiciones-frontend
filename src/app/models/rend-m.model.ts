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
  empleado:       string;
  nombreEmpleado: string;
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
  0: 'ABIERTO',
  1: 'CERRADO',
  2: 'CONTABILIZADO',
};

/** Clases del design system (_badges.scss) */
export const ESTADO_CLASS: Record<number, string> = {
  0: 'status-badge status-open',        // azul  — abierto
  1: 'status-badge status-closed',      // verde — cerrado/completado
  2: 'status-badge status-confirmed',   // naranja — contabilizado
};
