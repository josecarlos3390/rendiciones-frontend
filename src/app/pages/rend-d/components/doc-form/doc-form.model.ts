import { SelectOption } from '@shared/app-select/app-select.component';
import { CuentaDto } from '@services/sap.service';

export interface NormaSlotConfig {
  slot: number;
  label: string;
  dimensionId?: number;
  dimensionName?: string;
  rules: SelectOption[];
}

export interface DocFormConfig {
  cueCar: string;
  cueTexto: string;
  listaCuentas: CuentaDto[];
  proCar: string;
  proTexto: string;
  tipoDocOptions: SelectOption[];
  normaSlots: NormaSlotConfig[];
}

export interface DocFormSubmitData {
  cuenta: string;
  nombreCuenta: string;
  fecha: string;
  tipoDoc: string;
  idTipoDoc: number;
  tipoDocName: string;
  numDocumento: string;
  nroAutor: string;
  cuf: string;
  ctrl: string;
  prov: string;
  codProv: string;
  nit: string;
  concepto: string;
  importe: number;
  exento: number;
  ice: number;
  tasa: number;
  tasaCero: number;
  giftCard: number;
  descuento: number;
  iva: number;
  it: number;
  iue: number;
  rciva: number;
  montoIVA: number;
  montoIT: number;
  montoIUE: number;
  montoRCIVA: number;
  impRet: number;
  total: number;
  proyecto: string;
  n1: string;
  n2: string;
  n3: string;
  ctaExento: string;
  cuentaIVA: string;
  cuentaIT: string;
  cuentaIUE: string;
  cuentaRCIVA: string;
}
