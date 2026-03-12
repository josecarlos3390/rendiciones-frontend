export interface Documento {
  U_IdDocumento:   number;
  U_CodPerfil:     number;
  U_TipDoc:        string;
  U_EXENTOpercent: number;
  U_IdTipoDoc:     number;
  U_TipoCalc:      string;  // 'G' | 'N'
  U_IVApercent:    number;
  U_IVAcuenta:     string;
  U_ITpercent:     number;
  U_ITcuenta:      string;
  U_IUEpercent:    number;
  U_IUEcuenta:     string;
  U_RCIVApercent:  number;
  U_RCIVAcuenta:   string;
  U_CTAEXENTO:     string;
  U_TASA:          number;
  U_ICE:           number;
  U_NombrePerfil?: string;
}

export interface CreateDocumentoPayload {
  codPerfil:     number;
  tipDoc:        string;
  idTipoDoc:     number;
  tipoCalc:      string;
  ivaPercent:    number;
  ivaCuenta:     string;
  itPercent:     number;
  itCuenta:      string;
  iuePercent:    number;
  iueCuenta:     string;
  rcivaPercent:  number;
  rcivaCuenta:   string;
  exentoPercent: number;
  ctaExento:     string;
  tasa:          number;
  ice:           number;
}

export type UpdateDocumentoPayload = Partial<CreateDocumentoPayload>;

// Tipos de cálculo
export const TIPO_CALC_OPTIONS = [
  { value: 'G', label: 'Grossing Up' },
  { value: 'N', label: 'Normal' },
];
