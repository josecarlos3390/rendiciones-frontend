/** Refleja exactamente los campos de REND_RETAIL.REND_U */
export interface User {
  U_IdU:             number;    // INTEGER — PK
  U_Login:           string;    // NVARCHAR(10)
  U_NomUser:         string;    // NVARCHAR(100)
  U_NomSup:          string;    // NVARCHAR(100)
  U_SuperUser:       number;    // INTEGER — 1=Admin, 0=Normal
  U_Estado:          string;    // CHAR(1) — '1'=Activo, '0'=Inactivo, '2'=Bloqueado
  U_AppRend:         string;    // CHAR(1) — '1'=Sí, '0'=No
  U_AppConf:         string;    // CHAR(1) — '1'=Sí, '0'=No
  U_AppExtB:         string;    // CHAR(1) — '1'=Sí, '0'=No
  U_AppUpLA:         string;    // CHAR(1) — '1'=Sí, '0'=No
  U_GenDocPre:       string;    // CHAR(1) — '1'=Sí, '0'=No
  U_FECHAEXPIRACION: string;    // DATE YYYY-MM-DD
  U_FIJARNR:         string;    // CHAR(1) — '1'=Sí, '0'=No
  U_NR1:             string;    // NVARCHAR(50)
  U_NR2:             string;
  U_NR3:             string;
  U_NR4:             string;
  U_NR5:             string;
  U_FIJARSALDO:      string;    // CHAR(1) — '1'=Sí, '0'=No
}

/** Payload devuelto por /auth/login — subconjunto seguro */
export interface AuthUser {
  id:       number;
  username: string;
  name:     string;
  role:     'ADMIN' | 'USER';
  appRend:  string;
  appConf:  string;
}