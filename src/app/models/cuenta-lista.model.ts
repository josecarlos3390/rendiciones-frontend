export interface CuentaLista {
  U_IdPerfil:     number;
  U_CuentaSys:    string;
  U_Cuenta:       string;
  U_NombreCuenta: string;
  U_Relevante:    string;
  U_NombrePerfil?: string; // del JOIN con REND_PERFIL
}

export interface CreateCuentaListaPayload {
  idPerfil:     number;
  cuentaSys:    string;
  cuenta:       string;
  nombreCuenta: string;
  relevante?:   string;
}
