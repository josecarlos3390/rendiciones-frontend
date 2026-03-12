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
  { value: '1', label: 'Dólares (USD)' },
];

export const CARACTERISTICA_OPTIONS = [
  { value: 'TODOS',    label: 'TODOS' },
  { value: 'EMPIEZA',  label: 'Empieza con' },
  { value: 'CONTIENE', label: 'Contiene' },
  { value: 'IGUAL',    label: 'Igual a' },
];

export const LINEAS_OPTIONS = [3, 5, 10, 15, 20, 25, 30, 50];
