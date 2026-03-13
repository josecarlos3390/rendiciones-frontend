export interface Perfil {
  U_CodPerfil:      number;
  U_NombrePerfil:   string;
  U_Trabaja:        string  | null;
  U_Per_CtaBl:      number  | null;
  U_PRO_CAR:        string  | null;
  U_PRO_Texto:      string  | null;
  U_CUE_CAR:        string  | null;
  U_CUE_Texto:      string  | null;
  U_EMP_CAR:        string  | null;
  U_EMP_TEXTO:      string  | null;
  U_ControlPartida: number  | null;
  U_CntLineas:      number  | null;
  U_Bolivianos:     number  | null;
  U_SUCURSAL:       number  | null;
  U_REP1:           string  | null;
  U_REP2:           string  | null;
}

export interface CreatePerfilPayload {
  nombrePerfil:   string;
  trabaja?:       string;
  perCtaBl?:      number;
  proCar?:        string;
  proTexto?:      string;
  cueCar?:        string;
  cueTexto?:      string;
  empCar?:        string;
  empTexto?:      string;
  controlPartida?:number;
  cntLineas?:     number;
  bolivianos?:    number;
  sucursal?:      number;
  rep1?:          string;
  rep2?:          string;
}

export type UpdatePerfilPayload = Partial<CreatePerfilPayload>;

export const MONEDA_OPTIONS = [
  { value: '0', label: 'Moneda Local (BS)' },
  { value: '1', label: 'Moneda Sistema (USD)' },
];

export const PRO_CAR_OPTIONS = [
  { value: 'EMPIEZA', label: 'Empieza con' },
  { value: 'TERMINA', label: 'Termina con' },
  { value: 'TODOS',   label: 'TODOS' },
];

export const CUE_CAR_OPTIONS = [
  { value: 'EMPIEZA',   label: 'Empieza con' },
  { value: 'TERMINA',   label: 'Termina con' },
  { value: 'TODOS',     label: 'Todo el Plan de Cuentas' },
  { value: 'RANGO',     label: 'Cuentas que empiezan con y terminan en' },
  { value: 'LISTA',     label: 'Especificar una lista' },
];

export const EMP_CAR_OPTIONS = [
  { value: 'EMPIEZA', label: 'Empieza con' },
  { value: 'TERMINA', label: 'Termina con' },
  { value: 'NOTIENE', label: 'No tiene' },
];

export const LINEAS_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 50];