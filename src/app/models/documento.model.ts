export interface Documento {
  U_IdDocumento:   number;
  U_CodPerfil:     number;
  U_TipDoc:        string;
  U_EXENTOpercent: number;
  U_IdTipoDoc:     number;
  U_TipoCalc:      string | number;  // BD: 0 (GD) | 1 (GU) → se normaliza a 'N' | 'G' para el backend
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

// Tipos de documento SAP
export const TIPO_DOC_SAP_OPTIONS = [
  { value: 0,  label: 'SIN ASIGNAR' },
  { value: 1,  label: 'COMPRA' },
  { value: 2,  label: 'Boleto BSP' },
  { value: 3,  label: 'Importación' },
  { value: 4,  label: 'Recibo de alquiler' },
  { value: 5,  label: 'Nota de débito proveedor' },
  { value: 6,  label: 'Nota de crédito cliente' },
  { value: 7,  label: 'VENTA' },
  { value: 8,  label: 'Nota de débito cliente' },
  { value: 9,  label: 'Nota de crédito proveedor' },
  { value: 10, label: 'SIN ASIGNAR' },
];

// Tipos de cálculo
export const TIPO_CALC_OPTIONS = [
  { value: '1', label: 'Grossing Up' },
  { value: '0', label: 'Grossing Down' },
];