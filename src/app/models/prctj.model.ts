export interface RendPrctj {
  PRCT_RD_IDRD:      number;
  PRCT_RD_RM_IDREND: number;
  PRCT_RD_IDUSER:    number;
  PRCT_IDLINEA:      number;
  PRCT_PORCENTAJE:   number;
  PRCT_MONTO:        number;
  PRCT_RD_CUENTA:    string;
  PRCT_RD_NOMCUENTA: string;
  PRCT_RD_N1:        string;
  PRCT_RD_N2:        string;
  PRCT_RD_N3:        string;
  PRCT_RD_N4:        string;
  PRCT_RD_N5:        string;
  PRCT_RD_PROYECTO:  string;
  PRCT_RD_AUXILIAR1: string;
  PRCT_RD_AUXILIAR2: string;
  PRCT_RD_AUXILIAR3: string;
  PRCT_RD_AUXILIAR4: string;
}

/** Línea editable en el formulario (antes de guardar) */
export interface PrctjLineaForm {
  linea:      number;
  porcentaje: number;
  cuenta:     string;
  nomCuenta:  string;
  n1:         string;
  n2:         string;
  n3:         string;
  n4:         string;
  n5:         string;
  proyecto:   string;
  auxiliar1:  string;
  auxiliar2:  string;
  auxiliar3:  string;
  auxiliar4:  string;
}

export interface SavePrctjPayload {
  lineas: PrctjLineaForm[];
}