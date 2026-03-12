/** Refleja exactamente los campos de REND_RETAIL.REND_U */
export interface User {
  U_IdU:             number;    // PK
  U_Login:           string;    // max 10 chars
  U_NomUser:         string;    // nombre completo
  U_NomSup:          string;    // nombre supervisor
  U_SuperUser:       number;    // 1=ADMIN, 0=USER
  U_Estado:          string;    // 'A'=Activo, 'I'=Inactivo
  U_AppRend:         string;    // 'Y'|'N'
  U_AppConf:         string;    // 'Y'|'N'
  U_AppExtB:         string;    // 'Y'|'N'
  U_AppUpLA:         string;    // 'Y'|'N'
  U_GenDocPre:       string;    // 'Y'|'N'
  U_FECHAEXPIRACION: string;    // DATE YYYY-MM-DD
  U_FIJARNR:         string;    // 'Y'|'N'
  U_NR1:             string;
  U_NR2:             string;
  U_NR3:             string;
  U_NR4:             string;
  U_NR5:             string;
  U_FIJARSALDO:      string;    // 'Y'|'N'
}

/** Payload devuelto por /auth/login — subconjunto seguro */
export interface AuthUser {
  id:       number;    // U_IdU
  username: string;    // U_Login
  name:     string;    // U_NomUser
  role:     'ADMIN' | 'USER';
  appRend:  string;
  appConf:  string;
}