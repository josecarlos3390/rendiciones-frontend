import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

export interface UserPayload {
  name?:            string;
  supervisorName?:  string;
  superUser?:       number;
  estado?:          string;
  appRend?:         string;
  appConf?:         string;
  appExtB?:         string;
  appUpLA?:         string;
  genDocPre?:       string;
  fijarNr?:         string;
  nr1?:             string;
  nr2?:             string;
  nr3?:             string;
  nr4?:             string;
  nr5?:             string;
  fijarSaldo?:      string;
  fechaExpiracion?: string;
  password?:        string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private api  = `${environment.apiUrl}/users`;

  getAll() {
    return this.http.get<User[]>(this.api);
  }

  create(data: UserPayload & { login: string; password: string }) {
    return this.http.post<User>(this.api, data);
  }

  updateByAdmin(id: number, data: UserPayload) {
    return this.http.patch<User>(`${this.api}/${id}`, data);
  }

  toggleStatus(id: number, estado: '0' | '1', user: User) {
    const payload = {
      name:            user.U_NomUser        ?? '',
      supervisorName:  user.U_NomSup         ?? '',
      superUser:       user.U_SuperUser       ?? 0,
      appRend:         user.U_AppRend == '1' ? '1' : '0',
      appConf:         user.U_AppConf == '1' ? '1' : '0',
      appExtB:         user.U_AppExtB == '1' ? '1' : '0',
      appUpLA:         user.U_AppUpLA == '1' ? '1' : '0',
      genDocPre:       user.U_GenDocPre == '1' ? '1' : '0',
      fijarNr:         user.U_FIJARNR == '1' ? '1' : '0',
      nr1:             user.U_NR1             ?? '',
      nr2:             user.U_NR2             ?? '',
      nr3:             user.U_NR3             ?? '',
      nr4:             user.U_NR4             ?? '',
      nr5:             user.U_NR5             ?? '',
      fijarSaldo:      user.U_FIJARSALDO == '1' ? '1' : '0',
      estado,
      fechaExpiracion: user.U_FECHAEXPIRACION || undefined,
    };
    return this.http.patch<User>(`${this.api}/${id}`, payload);
  }

  getMe() {
    return this.http.get<User>(`${this.api}/me`);
  }

  updateMyName(name: string) {
    return this.http.patch<User>(`${this.api}/me`, { name });
  }

  updateMyPassword(data: { currentPassword: string; newPassword: string }) {
    return this.http.patch<{ message: string }>(`${this.api}/me/password`, data);
  }
}